import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as crypto from 'crypto';
import * as corsModule from 'cors';
import { Request, Response } from 'express';

const allowedOrigins = [
  'https://app.tagtokn.com',
  'https://tagtokn.com',
  'http://localhost:3000'
];

// Configure CORS
const corsOptions = {
  origin: allowedOrigins,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  optionsSuccessStatus: 204
};

const corsHandler = corsModule.default(corsOptions);

const handleCorsPreflight = (req: Request, res: Response) =>
  corsHandler(req, res, () => {
    res.status(204).send('');
  });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface OAuthState {
  uid: string;
  state: string;
  createdAt: admin.firestore.Timestamp;
  used: boolean;
}

/**
 * Generates an OAuth state parameter and stores it in Firestore
 */
export const generateOAuthState = functions.https.onRequest((req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Process the request
  return corsHandler(req, res, async () => {
    try {
      const { uid } = req.body;
      if (!uid) {
        res.status(400).json({ error: 'UID is required' });
        return;
      }

      // Generate a random state string
      const state = crypto.randomBytes(16).toString('hex');
      const stateData: OAuthState = {
        uid,
        state,
        createdAt: admin.firestore.Timestamp.now(),
        used: false
      };

      // Store the state in Firestore with a 1-hour expiration
      await db.collection('oauthStates').doc(state).set(stateData, { merge: true });
      
      // Clean up old states (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      const oldStates = await db.collection('oauthStates')
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(oneHourAgo))
        .get();
      
      const batch = db.batch();
      oldStates.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      res.status(200).json({ state });
    } catch (error) {
      console.error('Error generating OAuth state:', error);
      res.status(500).json({ 
        error: 'Failed to generate OAuth state',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
});

/**
 * Exchanges an Instagram OAuth code for an access token
 */
export const exchangeInstagramCode = functions.https.onRequest((req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Process the request
  return corsHandler(req, res, async () => {
    try {
      const { code, state } = req.body;
      if (!code || !state) {
        res.status(400).json({ error: 'Code and state are required' });
        return;
      }

      // Verify the state exists and is not used
      const stateDoc = await db.collection('oauthStates').doc(state).get();
      if (!stateDoc.exists) {
        res.status(400).json({ error: 'Invalid state parameter' });
        return;
      }

      const stateData = stateDoc.data() as OAuthState;
      if (stateData.used) {
        res.status(400).json({ error: 'State has already been used' });
        return;
      }

      // Mark state as used
      await stateDoc.ref.update({ used: true });

      // Get environment variables with fallbacks
      const appId = process.env.FACEBOOK_APP_ID || process.env.REACT_APP_FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.REACT_APP_FACEBOOK_APP_SECRET;
      const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 
                         process.env.REACT_APP_INSTAGRAM_REDIRECT_URI ||
                         'http://localhost:3000/auth/instagram/callback';

      if (!appId || !appSecret) {
        throw new Error('Facebook App ID and Secret must be configured');
      }

      // Exchange the code for an access token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
      }

      const tokenData = await tokenResponse.json();
      const { access_token: accessToken, user_id: instagramUserId } = tokenData;

      // Get long-lived access token
      const longLivedTokenResponse = await fetch(
        `https://graph.instagram.com/access_token?` +
        `grant_type=ig_exchange_token&` +
        `client_secret=${appSecret}&` +
        `access_token=${accessToken}`
      );

      if (!longLivedTokenResponse.ok) {
        const error = await longLivedTokenResponse.json();
        throw new Error(`Failed to get long-lived token: ${JSON.stringify(error)}`);
      }

      const longLivedTokenData = await longLivedTokenResponse.json();
      const longLivedToken = longLivedTokenData.access_token;
      const expiresIn = longLivedTokenData.expires_in || 5184000; // Default to 60 days if not provided

      // Get user profile
      const profileResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedToken}`
      );

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        throw new Error(`Failed to get user profile: ${JSON.stringify(error)}`);
      }

      const profile = await profileResponse.json();

      // Save the Instagram data to the user's document
      const userRef = db.collection('users').doc(stateData.uid);
      await userRef.set(
        {
          instagram: {
            userId: instagramUserId,
            username: profile.username,
            accountType: profile.account_type,
            mediaCount: profile.media_count,
            accessToken: longLivedToken,
            tokenExpiresAt: admin.firestore.Timestamp.fromMillis(
              Date.now() + (expiresIn * 1000)
            ),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

      const customToken = await admin.auth().createCustomToken(stateData.uid);

      res.status(200).json({
        success: true,
        token: customToken,
        userId: instagramUserId,
        username: profile.username,
        user: {
          uid: stateData.uid,
          instagramUserId,
          instagramUsername: profile.username,
          accountType: profile.account_type,
          mediaCount: profile.media_count
        }
      });
    } catch (error) {
      console.error('Error exchanging Instagram code:', error);
      res.status(500).json({
        error: 'Failed to exchange Instagram code',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
});
