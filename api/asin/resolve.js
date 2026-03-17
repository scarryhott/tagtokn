export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { region = 'US', asin, tag, title = null } = req.body || {};

    if (!asin) {
      return res.status(400).json({
        ok: false,
        asin_status: 'missing',
        error: 'Missing asin'
      });
    }

    if (!tag) {
      return res.status(400).json({
        ok: false,
        asin,
        asin_status: 'missing_tag',
        error: 'Missing affiliate tag'
      });
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
      return res.status(400).json({
        ok: false,
        asin,
        asin_status: 'unsupported_region',
        error: `Unsupported region: ${region}`
      });
    }

    if (!/^[A-Z0-9]{10}$/.test(asin)) {
      return res.status(400).json({
        ok: false,
        asin,
        region,
        asin_status: 'invalid_format',
        error: `Invalid ASIN format: ${asin}`
      });
    }

    const affiliate_link = `https://${market.host}/dp/${asin}?tag=${encodeURIComponent(tag)}`;

    return res.status(200).json({
      ok: true,
      asin,
      title,
      affiliate_link,
      region,
      tld: market.tld,
      verified_url: true,
      asin_status: 'verified'
    });
  } catch (err) {
    console.error('ASIN verify error:', err);
    return res.status(500).json({
      ok: false,
      asin_status: 'error',
      error: err?.message || 'Internal server error'
    });
  }
}
