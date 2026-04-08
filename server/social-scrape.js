/**
 * Basic server-side fetch + HTML text extraction for social / profile scraping.
 * Used to assist bio verification (still supports manual paste + NFC bio codes).
 */

const MAX_BYTES = 400_000;
const FETCH_TIMEOUT_MS = 12_000;

/** @param {string} host */
function isBlockedHost(host) {
  const h = String(host || '').toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0') return true;
  if (h.startsWith('[')) return true; // IPv6 — block in MVP
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/**
 * @param {string} rawUrl
 * @returns {{ ok: boolean, url?: string, error?: string }}
 */
export function parseScrapeUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return { ok: false, error: 'missing_url' };
  let u;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: 'invalid_url' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'unsupported_scheme' };
  }
  if (isBlockedHost(u.hostname)) {
    return { ok: false, error: 'blocked_host' };
  }
  return { ok: true, url: u.toString() };
}

function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html, prop, key = 'property') {
  const re = new RegExp(`<meta[^>]+${key}=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i');
  const m = re.exec(html);
  if (m) return m[1];
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${key}=["']${prop}["']`, 'i');
  const m2 = re2.exec(html);
  return m2 ? m2[1] : '';
}

function pageTitle(html) {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? m[1].trim() : '';
}

/**
 * @param {string} url
 * @returns {Promise<{ ok: boolean, url: string, title?: string, ogDescription?: string, textSample?: string, error?: string, status?: number }>}
 */
export async function scrapePublicProfilePage(url) {
  const parsed = parseScrapeUrl(url);
  if (!parsed.ok) return { ok: false, url: String(url || ''), error: parsed.error };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(parsed.url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        'User-Agent': 'NFC-TAP-SocialScrape/1.0 (identity verification assist)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return { ok: false, url: parsed.url, error: 'response_too_large', status: r.status };
    }
    const html = new TextDecoder('utf-8').decode(buf);
    const title = pageTitle(html);
    const ogDescription =
      metaContent(html, 'og:description') ||
      metaContent(html, 'description', 'name');
    const textSample = stripTags(html).slice(0, 24_000);
    return {
      ok: true,
      url: parsed.url,
      title,
      ogDescription,
      textSample,
      status: r.status,
    };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'timeout' : e?.message || String(e);
    return { ok: false, url: parsed.url, error: msg };
  } finally {
    clearTimeout(t);
  }
}
