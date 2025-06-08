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
