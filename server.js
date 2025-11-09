const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test route - placed early in the middleware stack
app.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.send('Test route is working!');
});

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
  const redirectUri = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI);
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
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