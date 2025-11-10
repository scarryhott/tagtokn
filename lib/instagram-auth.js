const axios = require('axios');
require('dotenv').config({ path: process.env.ENV_PATH || '.env.production' });

function createOAuthUrl() {
  // Use environment variables with fallback to direct values
  const clientId = process.env.FACEBOOK_APP_ID || '608108222327479';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'https://tagtokn.com/auth/instagram/callback';
  
  console.log('Environment Variables:', {
    FACEBOOK_APP_ID: clientId ? '***' + clientId.slice(-4) : 'Missing',
    FACEBOOK_REDIRECT_URI: redirectUri || 'Missing'
  });
  
  if (!clientId || !redirectUri) {
    const errorMsg = 'Missing required OAuth configuration';
    console.error(errorMsg, { clientId: !!clientId, redirectUri: !!redirectUri });
    throw new Error(errorMsg);
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_basic,pages_show_list',
      auth_type: 'rerequest',
      state: JSON.stringify({
        st: 'state123abc',
        ds: Math.floor(Math.random() * 1000000000).toString(),
        ts: Date.now()
      })
    });
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    console.log('Generated OAuth URL:', {
      base: 'https://www.facebook.com/v19.0/dialog/oauth',
      client_id: clientId ? '***' + clientId.slice(-4) : 'Missing',
      redirect_uri: redirectUri ? '***' + redirectUri.slice(-20) : 'Missing',
      scope: 'instagram_basic,pages_show_list'
    });
    
    return authUrl;
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    throw new Error('Failed to generate authentication URL');
  }
}

async function exchangeCodeForToken(code) {
  // Exchange code for access token
  const tokenParams = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
    code
  });

  try {
    // Get access token
    const tokenResponse = await axios.post(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token: accessToken } = tokenResponse.data;

    // Get user's Instagram account ID
    const accountsResponse = await axios.get(
      'https://graph.facebook.com/v19.0/me/accounts',
      {
        params: {
          access_token: accessToken,
          fields: 'instagram_business_account{id,username,profile_picture_url}'
        }
      }
    );

    // Extract Instagram Business Account ID
    const instagramAccount = accountsResponse.data.data[0]?.instagram_business_account;
    if (!instagramAccount) {
      throw new Error('No Instagram Business Account found for this user');
    }

    return {
      accessToken,
      instagramId: instagramAccount.id,
      username: instagramAccount.username,
      profilePicture: instagramAccount.profile_picture_url
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Instagram Graph API');
  }
}

module.exports = {
  createOAuthUrl,
  exchangeCodeForToken,
};
