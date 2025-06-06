import Cors from 'cors';
import initMiddleware from '../../lib/init-middleware';
import admin from 'firebase-admin';
import axios from 'axios';
import crypto from 'crypto';

// Allowed origins
const allowedOrigins = [
  'https://app.tagtokn.com',
  'https://tagtokn.com',
  'https://tagtokn-com.web.app',
  'http://localhost:3000'
];

// Initialize CORS middleware with proper configuration
const cors = initMiddleware(
  Cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `This site ${origin} does not have an access. Only specific domains are allowed.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['POST', 'OPTIONS', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Handle preflight requests
const allowCors = (fn) => async (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-V, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  } else if (origin) {
    // Origin not allowed
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  
  return await fn(req, res);
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      ),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

async function handler(req, res) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.body;
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Verify state in Firestore using admin SDK
    const stateDoc = await admin.firestore().collection('oauthStates').doc(state).get();
    if (!stateDoc.exists) {
      return res.status(400).json({ error: 'Invalid state' });
    }
    
    const stateData = stateDoc.data();
    
    // Check if state is already used or expired
    if (stateData.used) {
      return res.status(400).json({ error: 'State already used' });
    }
    
    if (stateData.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'State expired' });
    }

    // Mark state as used
    await stateDoc.ref.update({ 
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    const userId = stateData.uid;

    // 2. Exchange code for Instagram access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.REACT_APP_FACEBOOK_APP_ID,
        client_secret: process.env.REACT_APP_FACEBOOK_APP_SECRET,
        redirect_uri: 'https://tagtokn.com/auth/instagram/callback',
        code,
      },
    });

    const { access_token: accessToken } = tokenResponse.data;

    // 3. Get Instagram user data
    const userResponse = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username',
        access_token: accessToken,
      },
    });

    const { id: instagramId, username } = userResponse.data;

    // 4. Create or update user in Firestore
    const userRef = admin.firestore().collection('users').doc(stateData.uid);
    await userRef.set(
      {
        instagram: {
          id: instagramId,
          username,
          accessToken,
          connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    // 5. Create Firebase custom token
    const token = await admin.auth().createCustomToken(stateData.uid);

    return res.status(200).json({
      success: true,
      token,
      user: {
        instagramId,
        username,
      },
    });
  } catch (error) {
    console.error('Error in Instagram code exchange:', error);
    return res.status(500).json({
      error: 'Failed to process Instagram authentication',
      details: error.message,
    });
  }
}

export default allowCors(handler);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
