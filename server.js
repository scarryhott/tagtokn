const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const admin = require('firebase-admin');

// Load environment variables
dotenv.config({ 
  path: path.join(__dirname, '.env.production') 
});

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Content Security Policy aligned with hosted build headers
const cspDirectives = {
  defaultSrc: [
    "'self'",
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'https://*.firebase.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'data:',
    'gap:',
    'https://ssl.gstatic.com'
  ],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://*.firebase.com',
    'https://www.gstatic.com',
    'https://*.googleapis.com',
    'https://www.google.com',
    'https://www.google-analytics.com',
    'https://*.firebaseio.com'
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://www.google.com',
    'https://www.gstatic.com'
  ],
  fontSrc: [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
    'https://www.gstatic.com'
  ],
  imgSrc: [
    "'self'",
    'data:',
    'https:',
    'http:'
  ],
  connectSrc: [
    "'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebase.com',
    'https://www.googleapis.com',
    'https://*.google.com',
    'https://*.instagram.com',
    'https://graph.instagram.com'
  ],
  frameSrc: [
    "'self'",
    'https://*.firebaseapp.com',
    'https://*.google.com',
    'https://*.facebook.com',
    'https://*.instagram.com'
  ],
  mediaSrc: ['*', 'data:'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: [
    "'self'",
    'https://*.firebaseapp.com',
    'https://*.firebase.com'
  ],
  workerSrc: ["'self'", 'blob:'],
  childSrc: ["'self'", 'blob:'],
  frameAncestors: ["'self'"],
  'block-all-mixed-content': [],
  'upgrade-insecure-requests': []
};

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: cspDirectives
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'build')));

// Initialize Firebase Admin
try {
  const serviceAccount = require('./config/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin init error:', error.message);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('Please ensure serviceAccountKey.json exists in the config directory');
  }
  process.exit(1);
}

// Instagram OAuth route
app.get('/api/instagram/auth', (req, res) => {
  const metaAppId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID;
  const redirectTarget = process.env.FACEBOOK_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI;

  if (!metaAppId || !redirectTarget) {
    return res.status(500).json({ error: 'Meta OAuth is not configured on the server.' });
  }

  const redirectUri = encodeURIComponent(redirectTarget);
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=instagram_basic,user_profile,user_media&response_type=code&auth_type=rerequest`;
  console.log('Redirecting to Instagram OAuth:', authUrl);
  res.redirect(authUrl);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('\nTest these endpoints:');
  console.log(`- GET  http://localhost:${PORT}/test`);
  console.log(`- GET  http://localhost:${PORT}/api/instagram/auth`);
  
  // Test the /test endpoint immediately
  console.log('\n=== Testing /test endpoint ===');
  const http = require('http');
  const testReq = http.request(
    `http://localhost:${PORT}/test`,
    { method: 'GET' },
    (testRes) => {
      let data = '';
      testRes.on('data', (chunk) => { data += chunk; });
      testRes.on('end', () => {
        console.log(`Test route status: ${testRes.statusCode}`);
        console.log(`Test route response: ${data}`);
      });
    }
  );
  testReq.on('error', (e) => {
    console.error(`Test request failed: ${e.message}`);
  });
  testReq.end();
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
