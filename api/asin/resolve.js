export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    const {
      region = 'US',
      description,
      asin,
      title,
      tag = process.env.AMAZON_AFFILIATE_TAG || 'ratemyface0a-20'
    } = body;

    if (!description) {
      return res.status(400).json({ error: 'Missing description' });
    }

    if (!asin) {
      return res.status(400).json({ error: 'Missing asin' });
    }

    const domains = {
      US: { host: 'www.amazon.com', tld: 'com' },
      CA: { host: 'www.amazon.ca', tld: 'ca' },
      UK: { host: 'www.amazon.co.uk', tld: 'co.uk' },
      DE: { host: 'www.amazon.de', tld: 'de' },
      FR: { host: 'www.amazon.fr', tld: 'fr' },
      IT: { host: 'www.amazon.it', tld: 'it' },
      ES: { host: 'www.amazon.es', tld: 'es' },
      JP: { host: 'www.amazon.co.jp', tld: 'co.jp' },
      AU: { host: 'www.amazon.com.au', tld: 'com.au' },
      IN: { host: 'www.amazon.in', tld: 'in' }
    };

    const market = domains[region];
    if (!market) {
      return res.status(400).json({ error: `Unsupported region: ${region}` });
    }

    if (!/^[A-Z0-9]{10}$/.test(asin)) {
      return res.status(400).json({ error: `Invalid ASIN: ${asin}` });
    }

    if (!tag) {
      return res.status(400).json({ error: 'Missing affiliate tag' });
    }

    const affiliate_link = `https://${market.host}/dp/${asin}?tag=${encodeURIComponent(tag)}`;

    return res.status(200).json({
      asin,
      title: title || null,
      affiliate_link,
      region,
      tld: market.tld,
      verified_url: true,
      source: 'curated',
      debug: {
        description
      }
    });
  } catch (err) {
    console.error('asin resolve fatal error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err?.message || String(err)
    });
  }
}
