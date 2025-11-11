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
  const url = buildFunctionsUrl(path);
  console.log(`Calling function at: ${url}`, { payload });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...payload,
        // Include any additional metadata that might be needed
        clientId: process.env.REACT_APP_INSTAGRAM_APP_ID,
      }),
    });

    console.log('Raw response:', response);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    const data = await parseJsonResponse(response);
    return data;
  } catch (error) {
    console.error('Error in callInstagramFunction:', {
      error: error.message,
      url,
      payload
    });
    throw error;
  }
};

export const exchangeCodeForToken = async (code, state) => {
  try {
    console.log('Exchanging code for token with state:', state.substring(0, 8) + '...');
    
    // Exchange code for short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: process.env.REACT_APP_INSTAGRAM_APP_ID,
      client_secret: process.env.REACT_APP_INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: window.location.origin + '/auth/instagram/callback',
      code
    });

    // Get short-lived access token
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to exchange code for token');
    }

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.REACT_APP_INSTAGRAM_APP_SECRET}&access_token=${data.access_token}`);
    const longLivedData = await longLivedResponse.json();
    
    if (!longLivedData.access_token) {
      throw new Error('Failed to get long-lived access token');
    }

    // Get user profile
    const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${longLivedData.access_token}`);
    const userData = await userResponse.json();
    
    return {
      ...longLivedData,
      user: userData,
      is_business: false
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

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

    // Store the current URL to return after OAuth flow
    const currentUrl = window.location.href;
    sessionStorage.setItem('preOAuthUrl', currentUrl);

    // Request a new OAuth session with the current URL as redirect
    const redirectUri = `${window.location.origin}/auth/instagram/callback`;
    console.log('Initiating Instagram OAuth with redirect URI:', redirectUri);

    // First, get the OAuth state from the server
    const response = await callInstagramFunction('/generateOAuthState', { 
      uid: user.uid,
      redirectUri
    });

    if (!response || !response.state) {
      console.error('Invalid response from generateOAuthState:', response);
      throw new Error('Failed to generate OAuth state');
    }

    console.log('Generated OAuth state:', {
      state: response.state.substring(0, 8) + '...',
      expiresAt: response.expiresAt
    });

    // Store the state in sessionStorage
    // This ensures it's scoped to the current session and tab
    const stateString = response.state;
    sessionStorage.setItem('instagram_oauth_state', stateString);
    
    console.log('Stored OAuth state in sessionStorage:', {
      state: stateString.substring(0, 8) + '...'
    });

    // Debug: Log all environment variables for verification
    console.log('Environment variables:', {
      INSTAGRAM_APP_ID: process.env.REACT_APP_INSTAGRAM_APP_ID,
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_URL: process.env.PUBLIC_URL,
      // Add other relevant env vars for debugging
    });

    // Ensure we have the required app ID
    const appId = process.env.REACT_APP_INSTAGRAM_APP_ID || '608108222327479';
    if (!appId) {
      throw new Error('Instagram App ID is not configured');
    }

    // Build the Instagram Basic Display OAuth URL for personal accounts
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.append('client_id', appId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', response.state);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'user_profile,user_media');
    authUrl.searchParams.append('display', 'popup');
    
    console.log('Initiating OAuth flow with URL:', {
      hostname: authUrl.hostname,
      pathname: authUrl.pathname,
      state: response.state.substring(0, 8) + '...',
      redirect_uri: redirectUri,
      client_id: appId.substring(0, 4) + '...' + appId.slice(-4) // Show first and last 4 chars of app ID
    });
    
    // Open in a popup window for better UX
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl.toString(),
      'Connect Instagram',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
    
    // Set up a listener for the popup being closed
    const popupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupClosed);
        // Check if we have a success flag in localStorage
        const success = localStorage.getItem('instagram_auth_success');
        if (success) {
          localStorage.removeItem('instagram_auth_success');
          window.location.reload();
        }
      }
    }, 500);
    
    return { popup, redirected: false };
  } catch (error) {
    console.error('Error initiating Instagram OAuth:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error instanceof Error ? error : new Error('Failed to start Instagram connection');
  }
};

export const handleInstagramCallback = async (code, state) => {
  if (!state) {
    throw new Error('No state parameter received from Instagram');
  }

  // Get the state from sessionStorage
  const storedState = sessionStorage.getItem('instagram_oauth_state');
  
  if (!storedState) {
    console.log('No OAuth state found in sessionStorage');
    throw new Error('No active OAuth session found. Please try again.');
  }

  // For Basic API, the state might be in a different format
  const isBasicApi = !state.includes('facebook');
  let stateMatches = false;
  
  if (isBasicApi) {
    // For Basic API, we might need to parse the state if it's JSON
    try {
      const parsedState = JSON.parse(state);
      // Check if the state matches as part of the state object
      stateMatches = parsedState && parsedState.st === storedState;
    } catch (e) {
      // If not JSON, check direct string match
      stateMatches = storedState === state;
    }
  } else {
    // For Graph API, exact match is required
    stateMatches = storedState === state;
  }
  
  if (!stateMatches) {
    console.error('State verification failed:', {
      isBasicApi,
      storedState: storedState.substring(0, 8) + '...',
      receivedState: state.substring(0, 8) + '...',
      storedLength: storedState.length,
      receivedLength: state.length
    });
    throw new Error('Invalid state parameter. The OAuth state did not match.');
  }

  console.log('State verification successful:', {
    storedState: storedState.substring(0, 8) + '...',
    receivedState: state.substring(0, 8) + '...',
    isBasicApi
  });

  // Clean up the state after successful verification
  sessionStorage.removeItem('instagram_oauth_state');
  
  // Get the redirect URL before making the API call
  const preOAuthUrl = sessionStorage.getItem('preOAuthUrl') || '/';
  
  try {
    // Exchange the code for an access token
    const result = await exchangeCodeForToken(code, state);
    
    if (!result || !result.access_token) {
      throw new Error(result?.error || 'Failed to complete Instagram authentication');
    }
    
    console.log('Successfully obtained Instagram access token');
    
    // Clean up stored URLs
    localStorage.removeItem('preOAuthUrl');
    sessionStorage.removeItem('preOAuthUrl');
    
    // If this is in a popup, close it
    if (window.opener) {
      window.close();
    } else {
      // Otherwise, redirect to the original URL or dashboard
      window.location.href = preOAuthUrl || '/dashboard';
    }
    
    // Return the result with account type information
    return {
      ...result,
      success: true,
      is_business: !isBasicApi,
      redirectUrl: preOAuthUrl
    };
  } catch (error) {
    console.error('Instagram connection error:', error);
    // Clean up on error
    localStorage.removeItem('preOAuthUrl');
    sessionStorage.removeItem('preOAuthUrl');
    
    return { 
      error: error.message || 'Failed to connect Instagram account',
      details: error.details 
    };
  }
};
