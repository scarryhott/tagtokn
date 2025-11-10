import { auth, getCurrentUser } from '../firebase';

const DEFAULT_FUNCTIONS_BASE = 'https://us-central1-tagtokn.cloudfunctions.net';
const FUNCTIONS_BASE_URL = (process.env.REACT_APP_FUNCTIONS_BASE_URL || DEFAULT_FUNCTIONS_BASE).replace(/\/$/, '');
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

const requestFacebookAuthSession = async (uid) => {
  try {
    console.log('Requesting Facebook OAuth session from backend function...');
    const response = await callInstagramFunction('/generateFacebookAuthUrl', { uid });
    
    if (!response || !response.authUrl || !response.state || !response.stateDocId) {
      console.error('Invalid response from server:', response);
      throw new Error('Backend did not return a valid Facebook auth session.');
    }
    
    const { authUrl, state, stateDocId } = response;
    
    // Store the state information in session storage
    const stateData = {
      state,
      stateDocId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (29 * 60 * 1000) // 29 minutes from now (slightly less than server's 30m)
    };
    
    // Store the current URL to redirect back after successful auth
    const currentUrl = window.location.href;
    
    // Store all data in session storage
    sessionStorage.setItem('oauth_state', JSON.stringify(stateData));
    sessionStorage.setItem('preOAuthUrl', currentUrl);
    
    console.log('Stored OAuth state:', {
      state: state.substring(0, 8) + '...',
      stateDocId,
      expiresAt: new Date(stateData.expiresAt).toISOString(),
      currentUrl
    });
    
    return { 
      authUrl, 
      state,
      stateDocId
    };
  } catch (error) {
    console.error('Error requesting Facebook auth session:', error);
    throw error instanceof Error ? error : new Error('Failed to initialize Facebook auth session');
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
    
    const { authUrl, state } = await requestFacebookAuthSession(user.uid);
    
    if (!authUrl || !state) {
      throw new Error('Failed to generate Facebook OAuth session');
    }
    
    // Store the current URL to return after OAuth flow
    sessionStorage.setItem('preOAuthUrl', window.location.href);
    sessionStorage.setItem('instagram_oauth_state', state);
    
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
  // Get the stored state data
  const storedStateData = sessionStorage.getItem('oauth_state');
  
  // Check if we have any stored state at all
  if (!storedStateData) {
    const errorMsg = 'No stored OAuth state found. The OAuth flow might have been interrupted or the page was refreshed.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  let storedStateObj;
  try {
    storedStateObj = JSON.parse(storedStateData);
  } catch (e) {
    console.error('Failed to parse stored state data:', e);
    throw new Error('Invalid stored state format');
  }
  
  // Check if the stored state has expired
  if (storedStateObj.expiresAt && Date.now() > storedStateObj.expiresAt) {
    const errorMsg = 'OAuth session has expired. Please try again.';
    console.error(errorMsg, { 
      now: new Date().toISOString(),
      expiresAt: new Date(storedStateObj.expiresAt).toISOString() 
    });
    throw new Error(errorMsg);
  }
  
  // Verify the received state matches the stored state
  if (!state || state !== storedStateObj.state) {
    console.error('State parameter mismatch:', {
      receivedState: state ? `${state.substring(0, 8)}...` : 'MISSING',
      storedState: storedStateObj.state ? `${storedStateObj.state.substring(0, 8)}...` : 'MISSING',
      stateDocId: storedStateObj.stateDocId || 'MISSING',
      timestamp: new Date(storedStateObj.timestamp).toISOString()
    });
    throw new Error('Invalid state parameter - possible CSRF attack or session issue');
  }
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
