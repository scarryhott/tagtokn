import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as corsModule from 'cors';
import { Request, Response } from 'express';
import * as functions from 'firebase-functions';

// Type for the request body
type RequestWithBody = Request & {
  body: any;
};

const allowedOrigins = [
  'https://app.tagtokn.com',
  'https://tagtokn.com',
  'https://tagtokn.web.app',
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

const handleCorsPreflight = (req: Request, res: Response) => {
  return corsHandler(req, res, () => {
    res.status(204).send('');
  });
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
  
  // Use the emulator in development
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    admin.firestore().settings({
      host: 'localhost:8080',
      ssl: false
    });
  }
}

const db = admin.firestore();

interface OAuthState {
  uid: string;
  state: string;
  stateDocId?: string;
  redirectUri?: string | null;
  createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
  expiresAt?: admin.firestore.Timestamp;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
}

/**
 * Generates an OAuth state parameter and stores it in Firestore
 */
// Set CORS headers for all responses
const setCorsHeaders = (res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(','));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

export const generateOAuthState = functions.https.onRequest((req: RequestWithBody, res: Response) => {
  // Set CORS headers
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
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
      const state = crypto.randomBytes(32).toString('hex');
      const stateDocId = crypto.randomBytes(16).toString('hex');
      
      // Store the state in Firestore with a 10-minute expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const stateData = {
        uid,
        state,
        stateDocId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        used: false,
        redirectUri: req.body.redirectUri || null
      };

      await db.collection('oauthStates').doc(stateDocId).set(stateData);
      
      // Set HTTP-only secure cookie with the state
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure in production
        sameSite: 'lax' as const,
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.tagtokn.com' : 'localhost'
      };

      // Set the cookie
      res.cookie('oauth_state', stateDocId, cookieOptions);
      
      // Clean up old states (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      const oldStates = await db.collection('oauthStates')
        .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(oneHourAgo))
        .get();
      
      const batch = db.batch();
      oldStates.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      res.status(200).json({ 
        success: true,
        state: stateDocId, // Return the document ID as the state
        expiresAt: expiresAt.toISOString()
      });
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
export const exchangeInstagramCode = functions.https.onRequest((req: RequestWithBody, res: Response) => {
  // Set CORS headers
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Process the request
  return corsHandler(req, res, async () => {
    try {
      const { code, state: stateFromBody } = req.body;
      const stateFromCookie = req.cookies?.oauth_state;
      
      if (!code || !stateFromBody) {
        res.status(400).json({ 
          error: 'Code and state are required',
          details: { hasCode: !!code, hasState: !!stateFromBody }
        });
        return;
      }

      // Verify state from cookie matches the one in the request body
      if (stateFromBody !== stateFromCookie) {
        console.error('State mismatch:', { 
          stateFromBody, 
          stateFromCookie,
          cookies: req.cookies,
          headers: req.headers
        });
        res.status(400).json({ 
          error: 'Invalid state parameter',
          details: 'State mismatch between cookie and request body'
        });
        return;
      }

      // Verify the state exists and is not used
      const stateDoc = await db.collection('oauthStates').doc(stateFromBody).get();
      if (!stateDoc.exists) {
        res.status(400).json({ 
          error: 'Invalid state parameter',
          details: 'State not found in database'
        });
        return;
      }

      const stateData = stateDoc.data() as OAuthState;
      
      // Check if state has expired
      const now = new Date();
      if (stateData.expiresAt && (stateData.expiresAt as admin.firestore.Timestamp).toDate() < now) {
        res.status(400).json({ 
          error: 'State has expired',
          details: `Expired at: ${(stateData.expiresAt as admin.firestore.Timestamp).toDate()}`
        });
        return;
      }

      if (stateData.used) {
        res.status(400).json({ 
          error: 'State has already been used',
          details: `First used at: ${(stateData.usedAt as admin.firestore.Timestamp)?.toDate()}`
        });
        return;
      }

      // Mark state as used
      await stateDoc.ref.update({ used: true });

      // Get environment variables with fallbacks
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = process.env.FACEBOOK_REDIRECT_URI ||
                         process.env.REACT_APP_FACEBOOK_REDIRECT_URI ||
                         'http://localhost:3000/auth/instagram/callback';

      if (!appId || !appSecret) {
        throw new Error('Meta App ID and Secret must be configured in environment variables (FACEBOOK_APP_ID and FACEBOOK_APP_SECRET).');
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

      const tokenData = await tokenResponse.json() as { access_token: string; user_id: string };
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

      const longLivedTokenData = await longLivedTokenResponse.json() as { access_token: string; expires_in?: number };
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

      const profile = await profileResponse.json() as { username: string; account_type: string; media_count: number };

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
