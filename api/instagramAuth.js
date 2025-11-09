const axios = require('axios');
const admin = require('firebase-admin');

// Instagram OAuth configuration with validation
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;

// Validate configuration
if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET || !INSTAGRAM_REDIRECT_URI) {
  console.error('❌ Missing Instagram OAuth configuration. Please check your .env file.');
  console.log('Current configuration:');
  console.log(`- INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID ? 'Set' : 'Missing'}`);
  console.log(`- INSTAGRAM_APP_SECRET: ${INSTAGRAM_APP_SECRET ? 'Set' : 'Missing'}`);
  console.log(`- INSTAGRAM_REDIRECT_URI: ${INSTAGRAM_REDIRECT_URI || 'Missing'}`);
  process.exit(1);
}

console.log('✅ Instagram OAuth Configuration:');
console.log(`- App ID: ${INSTAGRAM_APP_ID ? '✓' : '✗'}`);
console.log(`- Redirect URI: ${INSTAGRAM_REDIRECT_URI}`);

// Exchange authorization code for access token
async function exchangeCodeForToken(code) {
  console.log('🔁 Exchanging code for token...');
  try {
    const response = await axios.post('https://api.instagram.com/oauth/access_token', null, {
      params: {
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code: code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Successfully exchanged code for token');
    return {
      access_token: response.data.access_token,
      user_id: response.data.user_id
    };
  } catch (error) {
    console.error('❌ Error exchanging code for token:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw new Error('Failed to exchange code for access token');
  }
}

// Get Instagram user profile
async function getInstagramUserProfile(accessToken) {
  console.log('📡 Fetching Instagram user profile...');
  try {
    const response = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: 'id,username',
        access_token: accessToken
      }
    });
    console.log('✅ Successfully fetched user profile');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting Instagram profile:', error.response?.data || error.message);
    throw new Error('Failed to get Instagram profile');
  }
}

// Main handler for Instagram OAuth callback
exports.handler = async (req, res) => {
  const { code, error: errorParam, error_reason: errorReason } = req.query;

  // Handle OAuth errors
  if (errorParam) {
    console.error('❌ Instagram OAuth Error:', { error: errorParam, reason: errorReason });
    return res.status(400).json({ 
      success: false, 
      error: `OAuth Error: ${errorParam}`,
      reason: errorReason
    });
  }

  if (!code) {
    console.error('❌ Missing authorization code');
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code is required' 
    });
  }

  try {
    console.log('🔑 Received Instagram OAuth code:', code);
    
    // Exchange code for access token
    const { access_token, user_id } = await exchangeCodeForToken(code);
    
    // Get user profile
    const profile = await getInstagramUserProfile(access_token);
    
    console.log('👤 User authenticated:', {
      user_id,
      username: profile.username,
      access_token: `${access_token.substring(0, 10)}...`
    });

    // Here you would typically:
    // 1. Find or create a user in your database
    // 2. Generate a JWT or session token
    // 3. Return the token to the client
    
    // For now, we'll just return the profile and token
    res.json({
      success: true,
      token: access_token, // In production, use a JWT or session token instead
      user: {
        id: user_id,
        username: profile.username,
        provider: 'instagram'
      }
    });
    
  } catch (error) {
    console.error('❌ Instagram OAuth error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to authenticate with Instagram' 
    });
  }
};

console.log('🔌 Instagram OAuth handler initialized');