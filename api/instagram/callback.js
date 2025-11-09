const { exchangeCodeForToken } = require('../../lib/instagram-auth');

module.exports = async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error_description || 'Authentication failed')}`);
  }

  try {
    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    // Redirect to success page with the token
    res.redirect(`/auth/success?token=${encodeURIComponent(tokenData.access_token)}`);
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
};
