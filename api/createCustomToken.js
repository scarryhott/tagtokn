import Cors from 'cors';
import initMiddleware from '../lib/init-middleware';
import admin from 'firebase-admin';

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: 'https://tagtokn.com',
    methods: ['POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
  })
);

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

export default async function handler(req, res) {
  // Run CORS middleware
  await cors(req, res);

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid } = req.body;
  
  // Validate UID
  if (!uid) {
    return res.status(400).json({ 
      error: 'Missing required parameter: uid' 
    });
  }

  try {
    console.log('Creating custom token for UID:', uid);
    const token = await admin.auth().createCustomToken(uid);
    
    console.log('Successfully created custom token');
    return res.status(200).json({ 
      success: true, 
      token 
    });
    
  } catch (error) {
    console.error('Error creating custom token:', error);
    return res.status(500).json({ 
      error: 'Failed to create custom token',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
