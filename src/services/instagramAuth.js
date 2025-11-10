import { auth, getCurrentUser } from '../firebase';

const DEFAULT_FUNCTIONS_BASE = 'https://us-central1-tagtokn.cloudfunctions.net';
const FUNCTIONS_BASE_URL = (process.env.REACT_APP_FUNCTIONS_BASE_URL || DEFAULT_FUNCTIONS_BASE).replace(/\/$/, '');
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const FACEBOOK_SCOPES = 'instagram_basic,user_profile,user_media';

const buildFunctionsUrl = (path) => {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${FUNCTIONS_BASE_URL}${sanitizedPath}`;
};

const parseJsonResponse = async (response) => {
  const bodyText = await response.text();

  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    const preview = bodyText.slice(0, 200);
    throw new Error(
      `Expected JSON from ${response.url || 'backend'}, but received: ${preview}`
    );
  }
};

const callInstagramFunction = async (path, payload) => {
  const response = await fetch(buildFunctionsUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.details || `Request failed with status ${response.status}`);
  }

  return data;
};

const generateInstagramAuthUrl = async (uid) => {
  try {
    console.log('Requesting OAuth state from backend function...');
    const { state } = await callInstagramFunction('/generateOAuthState', { uid });

    if (!state) {
      throw new Error('Backend did not return an OAuth state.');
    }

    console.log('Generated OAuth state:', state);

    // Instagram auth now uses Facebook's OAuth dialog
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_INSTAGRAM_APP_ID,
      redirect_uri: process.env.REACT_APP_INSTAGRAM_REDIRECT_URI,
      scope: FACEBOOK_SCOPES,
      response_type: 'code',
      state: state,
      auth_type: 'rerequest'
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
  } catch (error) {
    console.error('Error generating Instagram auth URL:', error);
    throw error;
  }
};

export const exchangeCodeForToken = async (code, state) => {
  try {
    return await callInstagramFunction('/exchangeInstagramCode', { code, state });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// getInstagramUserData function has been removed as it's not currently used

export const connectInstagram = async () => {
  try {
    // Get the current user or wait for auth state to resolve
    let user = auth.currentUser;
    if (!user) {
      try {
        user = await getCurrentUser();
      } catch (authError) {
        console.warn('Error waiting for Firebase auth state:', authError);
      }
    }

    if (!user) {
      console.log('No authenticated user, redirecting to login');
      // Store the current URL for redirection after login
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      const loginUrl = `/login?redirect_uri=${encodeURIComponent(currentUrl)}`;
      window.location.href = loginUrl;
      return { redirected: true };
    }
    
    // Generate the Instagram OAuth URL
    const authUrl = await generateInstagramAuthUrl(user.uid);
    
    if (!authUrl) {
      throw new Error('Failed to generate OAuth URL');
    }
    
    // Store the current URL to return after OAuth flow
    sessionStorage.setItem('preOAuthUrl', window.location.href);
    
    // Redirect to Instagram OAuth
    window.location.href = authUrl;
    return { redirected: true };
  } catch (error) {
    console.error('Error initiating Instagram OAuth:', error);
    throw error instanceof Error ? error : new Error('Failed to start Instagram connection');
  }
};

// Helper function to clean state parameter
const cleanStateParam = (state) => {
  if (!state) return '';
  return state.replace(/[^a-zA-Z0-9]/g, '');
};

export const handleInstagramCallback = async (code, state) => {
  try {
    console.log('Handling Instagram callback with code and state:', { code, state });
    
    if (!code || !state) {
      const errorMsg = 'Missing required parameters: code and state are required';
      console.error(errorMsg, { code, state });
      throw new Error(errorMsg);
    }

    // Clean the state parameter to match how it was stored
    const cleanState = cleanStateParam(state);
    console.log('Cleaned state parameter:', cleanState);

    // Get the redirect URL before making the API call
    const preOAuthUrl = sessionStorage.getItem('preOAuthUrl') || '/';
    
    // Exchange code for token and handle everything through Vercel function
    console.log('Exchanging Instagram code for access token...');
    const tokenData = await exchangeCodeForToken(code, state);
    
    if (!tokenData.success || !tokenData.token) {
      throw new Error(tokenData.error || 'Failed to complete Instagram authentication');
    }
    
    console.log('Successfully obtained custom token');
    
    // Clean up the stored URL
    sessionStorage.removeItem('preOAuthUrl');
    
    return { 
      success: true,
      token: tokenData.token,
      user: tokenData.user,
      redirectUrl: preOAuthUrl
    };
  } catch (error) {
    console.error('Instagram connection error:', error);
    return { 
      error: error.message || 'Failed to connect Instagram account',
      details: error.details 
    };
  }
};
