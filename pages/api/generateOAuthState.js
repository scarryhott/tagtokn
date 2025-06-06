import Cors from 'cors';
import initMiddleware from '../../lib/init-middleware';
import admin from 'firebase-admin';
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

  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    // Store the state in Firestore using admin SDK (bypasses security rules)
    await admin.firestore().collection('oauthStates').doc(state).set({
      uid,
      used: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clean up expired states
    const expiredStates = await admin
      .firestore()
      .collection('oauthStates')
      .where('expiresAt', '<', admin.firestore.Timestamp.now())
      .get();

    const batch = admin.firestore().batch();
    expiredStates.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return res.status(200).json({ state });
  } catch (error) {
    console.error('Error generating OAuth state:', error);
    return res.status(500).json({ 
      error: 'Failed to generate OAuth state',
      details: error.message 
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
