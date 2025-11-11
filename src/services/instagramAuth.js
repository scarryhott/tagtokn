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
    
    // Generate a secure random state
    const state = crypto.randomUUID();
    
    // Build the redirect URI - must match exactly with Facebook app settings
    const redirectUri = window.location.origin + "/auth/instagram/callback";
    
    // Store the current URL to redirect back after successful auth
    const currentUrl = window.location.href;
    
    // Store the state in both sessionStorage and localStorage for redundancy
    const stateData = {
      state,
      timestamp: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes expiration
      redirectUri,
      currentUrl
    };
    
    // Store in sessionStorage (primary) and localStorage (fallback)
    sessionStorage.setItem('instagram_oauth_state', state);
    localStorage.setItem('oauth_state', JSON.stringify(stateData));
    
    // Also store the current URL for redirect after auth
    sessionStorage.setItem('preOAuthUrl', currentUrl);
    
    console.log('Storing OAuth state:', {
      state: state.substring(0, 8) + '...',
      redirectUri,
      expiresAt: new Date(stateData.expiresAt).toISOString(),
      currentUrl
    });
    
    // Get the auth URL from the server
    const response = await callInstagramFunction('/generateFacebookAuthUrl', { 
      uid,
      state,
      redirect_uri: redirectUri
    });
    
    if (!response || !response.authUrl) {
      console.error('Invalid response from server:', response);
      throw new Error('Backend did not return a valid Facebook auth URL.');
    }
    
    console.log('Redirecting to OAuth URL:', response.authUrl);
    
    // Redirect to the auth URL
    window.location.href = response.authUrl;
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

    // Store only the minimal required state in sessionStorage
    // This ensures it's scoped to the current session and domain
    const stateString = response.state;
    sessionStorage.setItem('instagram_oauth_state', stateString);
    
    // Also store in localStorage as a fallback with a short expiration
    const stateData = {
      state: stateString,
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      timestamp: Date.now()
    };
    localStorage.setItem('oauth_state', JSON.stringify(stateData));
    
    console.log('Stored OAuth state:', {
      state: stateString.substring(0, 8) + '...',
      expiresAt: new Date(stateData.expiresAt).toISOString()
    });

    // Build the Instagram OAuth URL with latest API requirements
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    
    // Required parameters
    authUrl.searchParams.append('client_id', process.env.REACT_APP_FACEBOOK_APP_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', response.state);
    authUrl.searchParams.append('response_type', 'code');
    
    // Updated scopes for Instagram Graph API - using only necessary scopes
    const scopes = [
      'instagram_basic',
      'pages_show_list',
      'instagram_manage_insights',
      'instagram_content_publish',
      'pages_read_engagement'
    ];
    
    authUrl.searchParams.append('scope', scopes.join(','));
    
    // Recommended parameters
    authUrl.searchParams.append('auth_type', 'rerequest');
    authUrl.searchParams.append('display', 'popup');
    
    console.log('Initiating OAuth flow with URL:', {
      hostname: authUrl.hostname,
      pathname: authUrl.pathname,
      state: response.state.substring(0, 8) + '...',
      redirect_uri: redirectUri
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

// Helper function to clean state parameter
const cleanStateParam = (state) => {
  if (!state) return '';
  return state.replace(/[^a-zA-Z0-9]/g, '');
};

export const handleInstagramCallback = async (code, state) => {
  if (!state) {
    throw new Error('No state parameter received from Instagram');
  }

  // First try to get the state from sessionStorage (primary)
  let storedState = sessionStorage.getItem('instagram_oauth_state');
  
  // If not found in sessionStorage, try localStorage as fallback
  if (!storedState) {
    console.log('State not found in sessionStorage, checking localStorage...');
    const storedStateData = localStorage.getItem('oauth_state');
    
    if (storedStateData) {
      try {
        const parsedState = JSON.parse(storedStateData);
        // Check if the state in localStorage is expired
        if (parsedState.expiresAt && Date.now() > parsedState.expiresAt) {
          console.warn('State in localStorage has expired');
          localStorage.removeItem('oauth_state');
        } else {
          storedState = parsedState.state;
        }
      } catch (e) {
        console.error('Error parsing stored state from localStorage:', e);
        localStorage.removeItem('oauth_state');
      }
    }
  }

  // If we still don't have a stored state, throw an error
  if (!storedState) {
    const errorMsg = 'No valid OAuth state found. The session may have expired or the page was refreshed.';
    console.error(errorMsg, {
      hasSessionState: !!sessionStorage.getItem('instagram_oauth_state'),
      hasLocalState: !!localStorage.getItem('oauth_state')
    });
    throw new Error(errorMsg);
  }

  // Verify the state matches exactly
  if (storedState !== state) {
    console.error('State mismatch:', {
      storedState: storedState.substring(0, 8) + '...',
      receivedState: state.substring(0, 8) + '...',
      storedLength: storedState.length,
      receivedLength: state.length
    });
    throw new Error('Invalid state parameter. The OAuth state did not match.');
  }

  console.log('State verification successful:', {
    storedState: storedState.substring(0, 8) + '...',
    receivedState: state.substring(0, 8) + '...'
  });

  // Clean up the state after successful verification
  sessionStorage.removeItem('instagram_oauth_state');
  localStorage.removeItem('oauth_state');

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
    
    // Set success flag in localStorage for the popup to detect
    localStorage.setItem('instagram_auth_success', 'true');
    
    // If this is in a popup, close it
    if (window.opener) {
      window.close();
    } else {
      // Otherwise, redirect to the original URL or dashboard
      window.location.href = preOAuthUrl || '/dashboard';
    }
    
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
