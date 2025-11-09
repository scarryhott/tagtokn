const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables with debug logging
const envPath = path.join(__dirname, '.env');
console.log(`Loading environment from: ${envPath}`);

const envConfig = dotenv.config({ 
  path: envPath,
  debug: true
});

if (envConfig.error) {
  console.error('Error loading .env file:', envConfig.error);
  process.exit(1);
}

// Log loaded environment variables (be careful with secrets in production)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID ? '***' : 'MISSING',
  INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET ? '***' : 'MISSING',
  INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || 'MISSING'
});

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Request logging (only in production)
if (isProduction) {
  const morgan = require('morgan');
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Instagram OAuth route
app.get('/api/instagram/auth', (req, res) => {
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_REDIRECT_URI) {
    console.error('Missing Instagram OAuth configuration');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Instagram OAuth is not properly configured.'
    });
  }
  
  const redirectUri = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI);
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
  
  res.redirect(authUrl);
});

// Instagram OAuth callback
app.get('/api/instagram/callback', async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;
  
  if (error) {
    console.error('Instagram OAuth error:', { error, error_reason, error_description });
    return res.status(400).json({
      error: 'OAuth Error',
      message: error_description || error_reason || error
    });
  }
  
  if (!code) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing authorization code'
    });
  }
  
  try {
    // Exchange code for access token (implement this function)
    // const tokenData = await exchangeCodeForToken(code);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      // token: tokenData.access_token,
      // expiresIn: tokenData.expires_in
    });
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete authentication'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${isProduction ? 'PRODUCTION' : 'development'} mode`);
  console.log(`🌐 Listening on port ${PORT}`);
  
  // Verify required environment variables
  const requiredVars = [
    'NODE_ENV',
    'INSTAGRAM_APP_ID',
    'INSTAGRAM_APP_SECRET',
    'INSTAGRAM_REDIRECT_URI'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`- ${varName}`));
    process.exit(1);
  }
  
  console.log('\n✅ Environment variables verified');
  console.log('\nAvailable endpoints:');
  console.log(`- GET  /health`);
  console.log(`- GET  /api/instagram/auth`);
  console.log(`- GET  /api/instagram/callback`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
