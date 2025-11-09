const { createOAuthUrl } = require('../../lib/instagram-auth');

module.exports = async (req, res) => {
  try {
    const authUrl = createOAuthUrl();
    res.redirect(302, authUrl);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
