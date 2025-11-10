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

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,user_profile,user_media',
    response_type: 'code',
    auth_type: 'rerequest'
  });
  
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  console.log('Generated OAuth URL:', authUrl);
  return authUrl;
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
    code,
  });

  const response = await axios.post('https://api.instagram.com/oauth/access_token', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

module.exports = {
  createOAuthUrl,
  exchangeCodeForToken,
};
