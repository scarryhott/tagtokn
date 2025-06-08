const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import Instagram API functions
const instagram = require('./instagram');

// Export HTTP endpoints
exports.exchangeCodeForToken = instagram.exchangeCodeForToken;
exports.getUserMedia = instagram.getUserMedia;

// Export callable functions
exports.refreshInstagramToken = instagram.refreshToken;

// Scheduled function to refresh Instagram tokens (runs daily)
exports.scheduledTokenRefresh = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const now = Date.now();
      // Get all users with tokens expiring in the next 7 days
      const usersSnapshot = await admin.firestore()
        .collection('instagramUsers')
        .where('token_expiry', '<=', now + (7 * 24 * 60 * 60 * 1000))
        .get();

      const refreshPromises = usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        try {
          // Refresh the token
          const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: userData.access_token,
            },
          });

          // Update the token in Firestore
          await doc.ref.update({
            access_token: response.data.access_token,
            token_expiry: now + (response.data.expires_in * 1000),
            last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`Refreshed token for user: ${userData.username}`);
        } catch (error) {
          console.error(`Error refreshing token for user ${userData.username}:`, error.message);
          // If token is invalid, remove it
          if (error.response?.data?.error?.code === 190) {
            await doc.ref.update({
              access_token: admin.firestore.FieldValue.delete(),
              token_expiry: admin.firestore.FieldValue.delete(),
              last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      });

      await Promise.all(refreshPromises);
      console.log('Token refresh completed');
      return null;
    } catch (error) {
      console.error('Error in scheduledTokenRefresh:', error);
      return null;
    }
  });

const axios = require('axios');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
const db = admin.firestore();

// Set the global options for all functions
const runtimeOpts = {
  timeoutSeconds: 60,
  memory: '256MB',
};

// CORS middleware
const corsHandler = (req, res, callback) => {
  return cors(req, res, async () => {
    try {
      await callback(req, res);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Create custom token for Firebase Auth
exports.createCustomToken = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ error: 'Missing uid in request body' });
      }

      try {
        const token = await admin.auth().createCustomToken(uid);
        return res.status(200).json({ token });
      } catch (error) {
        console.error('Error creating custom token:', error);
        return res.status(500).json({ error: 'Failed to create custom token' });
      }
    } catch (error) {
      console.error('Unexpected error in createCustomToken:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Get Instagram user media
exports.getInstagramMedia = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User not authenticated');
  }

  const userId = request.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();
  const accessToken = userDoc.data()?.instagram?.accessToken;

  if (!accessToken) {
    throw new HttpsError('failed-precondition', 'Instagram not connected');
  }

  try {
    const response = await axios.get(`https://graph.instagram.com/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
        access_token: accessToken
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching Instagram media:', error);
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to fetch Instagram media', 
      error.message
    );
  }
});
