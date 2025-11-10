const axios = require('axios');

function createOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI,
    scope: 'instagram_basic,user_profile,user_media',
    response_type: 'code',
    auth_type: 'rerequest'
  });
  
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI,
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
