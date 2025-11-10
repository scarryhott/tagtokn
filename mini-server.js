const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Instagram OAuth route
app.get('/api/instagram/auth', (req, res) => {
  const metaAppId = process.env.FACEBOOK_APP_ID;
  const metaAppSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectTarget = process.env.FACEBOOK_REDIRECT_URI;

  if (!metaAppId || !metaAppSecret || !redirectTarget) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Instagram OAuth is not properly configured.'
    });
  }
  
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectTarget)}&scope=instagram_basic,user_profile,user_media&response_type=code&auth_type=rerequest`;
  
  res.redirect(authUrl);
});

// Instagram OAuth callback
app.get('/api/instagram/callback', async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;
  
  if (error) {
    return res.status(400).json({ 
      error: 'OAuth Error',
      error_reason,
      error_description
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' });
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
    return res.status(500).json({ 
      error: 'Failed to authenticate with Instagram'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
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
const server = app.listen(PORT, '0.0.0.0');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
