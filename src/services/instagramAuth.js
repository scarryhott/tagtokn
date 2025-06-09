import { auth } from '../firebase';

const generateInstagramAuthUrl = async (uid) => {
  try {
    console.log('Requesting OAuth state from Vercel function...');
    const response = await fetch('https://tagtokn.vercel.app/api/generateOAuthState', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate OAuth state');
    }

    const { state } = await response.json();
    console.log('Generated OAuth state:', state);

    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_FACEBOOK_APP_ID,
      redirect_uri: process.env.REACT_APP_INSTAGRAM_REDIRECT_URI,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state: state,
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  } catch (error) {
    console.error('Error generating Instagram auth URL:', error);
    throw error;
  }
};

export const exchangeCodeForToken = async (code, state) => {
  try {
    const response = await fetch('https://tagtokn.vercel.app/api/exchangeInstagramCode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to exchange code for token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// getInstagramUserData function has been removed as it's not currently used

export const connectInstagram = async () => {
  try {
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user, redirecting to login');
      // Store the current URL for redirection after login
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      window.location.href = `/login?redirect_uri=${encodeURIComponent(currentUrl)}`;
      return Promise.reject(new Error('User not authenticated'));
    }
    
    // Generate the Instagram OAuth URL using Vercel function
    const authUrl = await generateInstagramAuthUrl(user.uid);
    
    if (!authUrl) {
      throw new Error('Failed to generate OAuth URL');
    }
    
    // Redirect to Instagram OAuth
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating Instagram OAuth:', error);
    throw new Error('Failed to start Instagram connection');
  }
};

// Helper function to clean state parameter
const cleanStateParam = (state) => {
  if (!state) return '';
  return state.replace(/[^a-zA-Z0-9]/g, '');
};

export const handleInstagramCallback = async (code, state) => {
  // These variables are not currently used
  // let oauthStateRef = null;
  // let userId = null;
  
  try {
    console.log('Handling Instagram callback with code and state:', { code, state });
    
    if (!code || !state) {
      console.error('Missing required parameters:', { code, state });
      throw new Error('Missing required parameters: code and state are required');
    }

    // Clean the state parameter to match how it was stored
    const cleanState = cleanStateParam(state);
    console.log('Cleaned state parameter:', cleanState);

    // Exchange code for token and handle everything through Vercel function
    console.log('Exchanging Instagram code for access token...');
    const tokenData = await exchangeCodeForToken(code, state);
    
    if (!tokenData.success || !tokenData.token) {
      throw new Error(tokenData.error || 'Failed to complete Instagram authentication');
    }
    
    console.log('Successfully obtained custom token');
    return { 
      token: tokenData.token,
      user: tokenData.user 
    };
  } catch (error) {
    console.error('Instagram connection error:', error);
    return { 
      error: error.message || 'Failed to connect Instagram account',
      details: error.details 
    };
  }
};
