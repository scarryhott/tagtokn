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
    
    // Store all data in localStorage for persistence across redirects
    localStorage.setItem('oauth_state', JSON.stringify(stateData));
    localStorage.setItem('preOAuthUrl', currentUrl);
    
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
    // Get the stored state data to include the state document ID
    const storedStateData = localStorage.getItem('oauth_state') || sessionStorage.getItem('oauth_state');
    if (!storedStateData) {
      throw new Error('No stored OAuth state found');
    }
    
    const storedStateObj = JSON.parse(storedStateData);
    
    // The backend expects the state to be the document ID, not the state value
    const stateDocId = storedStateObj.stateDocId;
    
    if (!stateDocId) {
      throw new Error('No state document ID found in stored state');
    }
    
    console.log('Exchanging code with state document ID:', stateDocId);
    
    return await callInstagramFunction('/exchangeInstagramCode', { 
      code, 
      state: stateDocId // Send the state document ID as the state parameter
    });
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
    
    // Request a new OAuth session with the current URL as redirect
    const redirectUri = window.location.origin + '/auth/instagram/callback';
    const response = await callInstagramFunction('/generateOAuthState', { 
      uid: user.uid,
      redirectUri
    });
    
    if (!response.success || !response.state) {
      throw new Error('Failed to generate OAuth state');
    }
    
    // Store minimal state in localStorage as a fallback
    localStorage.setItem('oauth_state', JSON.stringify({
      state: response.state,
      expiresAt: new Date(response.expiresAt).getTime()
    }));
    
    // The server will set an HTTP-only cookie with the state
    // Now build the Instagram OAuth URL
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.append('client_id', process.env.REACT_APP_FACEBOOK_APP_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', response.state);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'public_profile,email,instagram_basic,pages_show_list,pages_read_engagement');
    authUrl.searchParams.append('auth_type', 'rerequest');
    
    // Store the current URL to return after OAuth flow
    sessionStorage.setItem('preOAuthUrl', window.location.href);
    
    // Redirect to Instagram OAuth
    window.location.href = authUrl.toString();
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
  const storedStateData = localStorage.getItem('oauth_state') || sessionStorage.getItem('oauth_state');
  
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
    // Clean up expired state
    localStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    throw new Error(errorMsg);
  }
  
  // Verify we have the state document ID
  if (!storedStateObj.stateDocId) {
    const errorMsg = 'Missing state document ID. Cannot verify OAuth state.';
    console.error(errorMsg, { storedStateObj });
    // Clean up invalid state
    localStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    throw new Error(errorMsg);
  }

  // Log state verification for debugging
  console.log('Proceeding with state verification', {
    stateDocId: storedStateObj.stateDocId,
    receivedState: state ? `${state.substring(0, 8)}...` : 'MISSING',
    storedState: storedStateObj.state ? `${storedStateObj.state.substring(0, 8)}...` : 'MISSING',
    expiresAt: storedStateObj.expiresAt ? new Date(storedStateObj.expiresAt).toISOString() : 'NO_EXPIRY'
  });
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
    localStorage.removeItem('preOAuthUrl');
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
