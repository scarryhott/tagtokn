const functions = require('firebase-functions');
const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Instagram API configuration
const metaConfig = functions.config().facebook || {};
const META_APP_ID = metaConfig.app_id || process.env.FACEBOOK_APP_ID;
const META_APP_SECRET = metaConfig.app_secret || process.env.FACEBOOK_APP_SECRET;

/**
 * Exchange authorization code for access token
 */
// CORS configuration
const cors = require('cors')({ 
  origin: [
    'https://tagtokn.com',
    'https://www.tagtokn.com',
    'https://tagtokn.web.app',
    'http://localhost:3000' // For local development
  ],
  credentials: true
});

exports.exchangeCodeForToken = functions.https.onRequest((req, res) => {
  // Handle CORS preflight
  return cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Exchange code for short-lived access token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', null, {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri,
        code,
      },
    });

    const { access_token: shortLivedToken, user_id } = tokenResponse.data;

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: META_APP_SECRET,
        access_token: shortLivedToken,
      },
    });

    const longLivedToken = longLivedResponse.data.access_token;
    const expiresIn = longLivedResponse.data.expires_in; // Usually 5184000 seconds (60 days)


    // Get user profile
    const profileResponse = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: 'id,username,account_type',
        access_token: longLivedToken,
      },
    });

    const userData = {
      ...profileResponse.data,
      access_token: longLivedToken,
      token_expiry: Date.now() + (expiresIn * 1000), // Convert to milliseconds
    };

    // Store or update user data in Firestore
    const userRef = db.collection('instagramUsers').doc(user_id);
    await userRef.set(userData, { merge: true });

    // Return the token and user data to the client
    res.json({
      access_token: longLivedToken,
      user_id,
      username: profileResponse.data.username,
      expires_in: expiresIn,
    });

  } catch (error) {
    console.error('Instagram OAuth error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to authenticate with Instagram',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * Get user's Instagram media
 */
exports.getUserMedia = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    res.status(204).send('');
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = authHeader.split(' ')[1];
    const { limit = 12, cursor } = req.query;

    // Build the URL with pagination if cursor is provided
    let url = 'https://graph.instagram.com/me/media';
    const params = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
      access_token: accessToken,
      limit,
    });

    if (cursor) {
      params.append('after', cursor);
    }

    const response = await axios.get(`${url}?${params.toString()}`);
    
    // Format the response to include pagination info
    const responseData = response.data;
    const media = responseData.data || [];
    const nextCursor = responseData.paging?.cursors?.after || null;
    const hasMore = !!nextCursor;

    res.json({
      media,
      next_cursor: nextCursor,
      has_more: hasMore,
    });

  } catch (error) {
    console.error('Error fetching Instagram media:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch Instagram media',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * Refresh Instagram access token
 */
exports.refreshToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
  }

  try {
    // Get the user's current token from Firestore
    const userDoc = await db.collection('instagramUsers').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const currentToken = userData.access_token;

    // Refresh the token
    const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: currentToken,
      },
    });

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    // Update the token in Firestore
    await userDoc.ref.update({
      access_token: newToken,
      token_expiry: Date.now() + (expiresIn * 1000),
      last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      expires_in: expiresIn,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh token', error);
  }
});
