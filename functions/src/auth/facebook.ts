import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as corsModule from 'cors';
import { Request, Response } from 'express';
import * as functions from 'firebase-functions';
import axios from 'axios';

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
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
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
  createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
  used: boolean;
}

// In functions/src/auth/facebook.ts
export const generateFacebookAuthUrl = functions.https.onRequest((req: RequestWithBody, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  return corsHandler(req, res, async () => {
    try {
      const { uid } = req.body;
      
      if (!uid) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Get config values from Firebase config
      const config = functions.config();
      const clientId = config.facebook?.app_id || process.env.FACEBOOK_APP_ID || '608108222327479';
      const redirectUri = config.facebook?.redirect_uri || process.env.FACEBOOK_REDIRECT_URI || 'https://tagtokn.com/auth/instagram/callback';

      // Log the config values for debugging
      console.log('Facebook Config:', {
        clientId: clientId ? '***' + String(clientId).slice(-4) : 'MISSING',
        redirectUri: redirectUri || 'MISSING'
      });

      // Generate a random state parameter
      const state = crypto.randomBytes(16).toString('hex');
      const stateRef = db.collection('oauth_states').doc(state);
      
      // Store the state with user ID and expiration
      await stateRef.set({
        uid,
        state,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        used: false
      });

      // Create Facebook OAuth URL
      const facebookAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      facebookAuthUrl.searchParams.append('client_id', clientId);
      facebookAuthUrl.searchParams.append('redirect_uri', redirectUri);
      facebookAuthUrl.searchParams.append('state', state);
      facebookAuthUrl.searchParams.append('response_type', 'code');
      facebookAuthUrl.searchParams.append('scope', 'public_profile,email,instagram_basic,pages_show_list');
      facebookAuthUrl.searchParams.append('auth_type', 'rerequest');

      console.log('Generated Facebook Auth URL:', {
        base: 'https://www.facebook.com/v19.0/dialog/oauth',
        client_id: clientId ? '***' + String(clientId).slice(-4) : 'MISSING',
        redirect_uri: redirectUri,
        state: state
      });

      res.json({ 
        authUrl: facebookAuthUrl.toString(),
        state
      });
    } catch (error) {
      console.error('Error generating Facebook auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
  });
});

/**
 * Handles the OAuth callback from Facebook
 */
export const handleFacebookCallback = functions.https.onRequest((req: RequestWithBody, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  return corsHandler(req, res, async () => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        res.status(400).json({ error: 'Code and state are required' });
        return;
      }

      // Verify the state parameter
      const stateRef = db.collection('oauth_states').doc(state as string);
      const stateDoc = await stateRef.get();
      
      if (!stateDoc.exists) {
        res.status(400).json({ error: 'Invalid state parameter' });
        return;
      }
      
      const stateData = stateDoc.data() as OAuthState;
      
      // Check if state has already been used
      if (stateData.used) {
        return res.status(400).json({ error: 'State has already been used' });
      }
      
      // Mark state as used
      await stateRef.update({ used: true });
      
      if (typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).json({ error: 'Invalid code or state parameter' });
        return;
      }

      // Exchange the authorization code for an access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
          code
        }
      });

      const { access_token: accessToken } = tokenResponse.data;

      // Get user's Facebook profile
      const profileResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email',
          access_token: accessToken
        }
      });

      const { id: facebookId, name, email } = profileResponse.data;

      // Here you would typically:
      // 1. Create or update the user in your database
      // 2. Create a Firebase custom token
      // 3. Return the token to the client

      // For now, just return the user info
      res.json({
        success: true,
        user: {
          facebookId,
          name,
          email
        },
        accessToken
      });
      return;

    } catch (error) {
      console.error('Error handling Facebook callback:', error);
      res.status(500).json({ error: 'Failed to authenticate with Facebook' });
      return;
    }
  });
});
