import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

// Helper function to clean state parameter
const cleanStateParam = (state) => {
  if (!state) return '';
  return String(state).replace(/[^a-zA-Z0-9]/g, '');
};

export default async function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = [
    'https://tagtokn.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  try {
    const { uid, state } = req.body;
    
    if (!uid) {
      return res.status(400).json({ 
        success: false,
        error: 'UID is required' 
      });
    }

    // If state is provided, verify it exists in Firestore
    if (state) {
      const cleanState = cleanStateParam(state);
      if (cleanState) {
        const db = admin.firestore();
        const stateDoc = await db.collection('oauth_states').doc(cleanState).get();
        
        if (!stateDoc.exists) {
          console.warn(`State ${cleanState} not found in Firestore`);
          return res.status(400).json({
            success: false,
            error: 'Invalid state parameter',
            code: 'invalid_state'
          });
        }
      }
    }

    // Generate a custom token for the specified UID
    const token = await admin.auth().createCustomToken(uid);
    
    // Return the custom token
    return res.status(200).json({ 
      success: true,
      token 
    });
    
  } catch (error) {
    console.error('Error in Instagram callback handler:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error.code || 'internal_error';
    
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process request',
      details: errorMessage,
      code: errorCode
    });
  }
}
