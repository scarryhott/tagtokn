const axios = require('axios');

function createOAuthUrl() {
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    console.error('Missing required environment variables:');
    console.error(`FACEBOOK_APP_ID: ${clientId ? 'Set' : 'Missing'}`);
    console.error(`FACEBOOK_REDIRECT_URI: ${redirectUri || 'Missing'}`);
    throw new Error('Server configuration error: Missing required OAuth credentials');
  }

    // Instagram Graph API requires these permissions
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'instagram_graph_user_profile,instagram_graph_user_media,pages_show_list',
    auth_type: 'rerequest',
    state: JSON.stringify({
      st: 'state123abc',
      ds: Math.floor(Math.random() * 1000000000).toString()
    })
  });
  
  // Using Facebook Login with Instagram Graph API permissions
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  console.log('Generated OAuth URL:', authUrl);
  return authUrl;
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
