/**
 * TAP Network — Backend Server
 * 
 * Express server that handles:
 * - Real wallet operations (private keys never touch the browser)
 * - Real AI fulfillment via OpenAI
 * - On-chain transaction signing and broadcasting
 * - Transaction verification
 * 
 * Run: node server/index.js
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WalletManager } from './wallet-manager.js';
import { RealCodexService } from './ai-service.js';
import { openDb, initDb } from './db.js';
import { ensureSocialPost, listNft, mintNftFromVerifiedPost, purchaseListing } from './nft-logic.js';
import {
    computeTutteEmbedding,
    runTutteRelaxation,
    scoreCandidateConnectivity,
    updateUserReputationFromEpoch,
    computePerspectivalPaths,
    computeNftTemporalTrail,
} from './engine.js';
import { id as makeId, nowIso } from './ids.js';
import { appendNrrEpochObservations, getNrrLedger } from './nrr-identity.js';
import { renderNftFacesSvg } from './render.js';
import {
    computeUserGuideVectors,
    previewConnectionImpact,
    applyConnectionWithCollapse,
    applyInadmissibleInterconnectTax,
    NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA,
    recordInadmissibleTaxPerspectivalDomain,
} from './guides-collapse.js';
import {
    registerUser,
    loginUser,
    createSession,
    getSessionUserId,
    parseBearer,
    requireAuth,
    effectiveNftOwnerRow,
} from './auth.js';
import {
    syncPostNftRefsFromContent,
    getMintTaggingHint,
    generateBioVerificationCode,
    bioTextContainsVerificationCode,
} from './social-identity.js';
import { scrapePublicProfilePage, parseScrapeUrl } from './social-scrape.js';
import { computeTutteBarbourNovelty } from './novelty-tutte.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Agent configuration ---
const AGENTS = [
    { id: 'node-1', name: 'Artisanal Coffee', role: 'coffee' },
    { id: 'node-2', name: 'Community Bookstore', role: 'bookstore' },
    { id: 'node-3', name: 'Alice', role: 'citizen' },
    { id: 'node-4', name: 'Club 412', role: 'club' },
    { id: 'node-5', name: 'Bob', role: 'citizen' },
    { id: 'node-6', name: 'City Museum', role: 'museum' },
];

// --- Initialize services ---
const walletManager = new WalletManager(
    process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    parseInt(process.env.CHAIN_ID || '84532')
);

const aiService = new RealCodexService(process.env.OPENAI_API_KEY);

// --- Initialize internal DB (graph/NFT marketplace) ---
const db = openDb({ filename: process.env.NFC_DB_PATH || 'data/nfc.db' });
initDb(db);
const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS || '1000'); // 10% default
const NFC_SOCIAL_ADMIN_KEY = process.env.NFC_SOCIAL_ADMIN_KEY || '';
const requireSession = requireAuth(db);

let isInitialized = false;

function buildAffiliateLink({ region, asin, tag }) {
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
    if (!market) throw new Error(`Unsupported region: ${region}`);
    if (!/^[A-Z0-9]{10}$/.test(asin)) throw new Error(`Invalid ASIN: ${asin}`);
    if (!tag) throw new Error('Missing affiliate tag');

    return {
        affiliate_link: `https://${market.host}/dp/${asin}?tag=${encodeURIComponent(tag)}`,
        tld: market.tld
    };
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /api/status - Server health + initialization status
 */
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        initialized: isInitialized,
        chain: 'Base Sepolia',
        chainId: 84532,
        rpc: process.env.BASE_SEPOLIA_RPC,
        treasuryAddress: process.env.TREASURY_ADDRESS,
        agents: AGENTS.length,
        aiModel: 'gpt-4o-mini',
        aiUsage: aiService.getUsageStats(),
        internalDb: {
            path: process.env.NFC_DB_PATH || 'data/nfc.db',
            platformFeeBps: PLATFORM_FEE_BPS
        },
        auth: { sessionsEnabled: true, socialVerifiedRequiresAdminKey: !!NFC_SOCIAL_ADMIN_KEY }
    });
});

/**
 * POST /api/auth/register — Create account; returns Bearer token
 */
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body || {};
        const { userId, username: uname } = registerUser(db, { username, password });
        const { token, expiresAt } = createSession(db, userId);
        res.status(201).json({
            token,
            expiresAt,
            user: { id: userId, username: uname },
        });
    } catch (err) {
        const code = err.message === 'username_taken' ? 409 : 400;
        res.status(code).json({ error: err.message });
    }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        const { userId, username: uname } = loginUser(db, { username, password });
        const { token, expiresAt } = createSession(db, userId);
        res.json({ token, expiresAt, user: { id: userId, username: uname } });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

/**
 * GET /api/auth/me — Current user from Bearer token
 */
app.get('/api/auth/me', (req, res) => {
    const userId = getSessionUserId(db, parseBearer(req));
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const row = db.prepare(`
      SELECT user_id, username, display_name, bio, show_social_public FROM users WHERE user_id = ?
    `).get(userId);
    if (!row) return res.status(401).json({ error: 'unauthorized' });
    const socialLinks = db.prepare(`
      SELECT link_id, platform, handle, profile_url, is_public, verified_admin,
             verification_code, bio_verified_at
      FROM user_social_links WHERE user_id = ? ORDER BY created_at ASC
    `).all(userId);
    res.json({
        user: {
            id: row.user_id,
            username: row.username,
            displayName: row.display_name || '',
            bio: row.bio || '',
            showSocialPublic: !!row.show_social_public,
        },
        socialLinks,
    });
});

/**
 * PATCH /api/me/profile — display name, bio, public social visibility
 */
app.patch('/api/me/profile', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { displayName, bio, showSocialPublic } = req.body || {};
        if (displayName !== undefined) {
            db.prepare(`UPDATE users SET display_name = ? WHERE user_id = ?`).run(String(displayName).slice(0, 120), uid);
        }
        if (bio !== undefined) {
            db.prepare(`UPDATE users SET bio = ? WHERE user_id = ?`).run(String(bio).slice(0, 2000), uid);
        }
        if (showSocialPublic !== undefined) {
            db.prepare(`UPDATE users SET show_social_public = ? WHERE user_id = ?`).run(showSocialPublic ? 1 : 0, uid);
        }
        const row = db.prepare(`SELECT user_id, username, display_name, bio, show_social_public FROM users WHERE user_id = ?`).get(uid);
        res.json({
            user: {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name || '',
                bio: row.bio || '',
                showSocialPublic: !!row.show_social_public,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/me/social-links — link a social account (shown publicly when is_public + profile allows)
 */
app.post('/api/me/social-links', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { platform, handle, profileUrl = '', isPublic = true } = req.body || {};
        if (!platform || !handle) {
            return res.status(400).json({ error: 'invalid_payload', required: ['platform', 'handle'] });
        }
        const linkId = makeId('soc');
        const verificationCode = generateBioVerificationCode();
        db.prepare(
            `
      INSERT INTO user_social_links (link_id, user_id, platform, handle, profile_url, is_public, verified_admin, verification_code, bio_verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, '', ?)
    `,
        ).run(
            linkId,
            uid,
            String(platform).trim(),
            String(handle).trim(),
            String(profileUrl || '').trim(),
            isPublic ? 1 : 0,
            verificationCode,
            nowIso(),
        );
        const row = db.prepare(`SELECT * FROM user_social_links WHERE link_id = ?`).get(linkId);
        res.status(201).json({ link: row });
    } catch (err) {
        if (String(err.message || err).includes('UNIQUE')) {
            return res.status(409).json({ error: 'link_exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/me/social-links/:linkId/verify-bio — paste profile bio; must contain verification_code
 */
app.post('/api/me/social-links/:linkId/verify-bio', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { linkId } = req.params;
        const { bioText } = req.body || {};
        const row = db.prepare(`SELECT * FROM user_social_links WHERE link_id = ? AND user_id = ?`).get(linkId, uid);
        if (!row) return res.status(404).json({ error: 'not_found' });
        if (row.verified_admin) {
            return res.json({ success: true, bioVerifiedAt: row.bio_verified_at, alreadyVerified: true });
        }
        if (!row.verification_code || !String(row.verification_code).trim()) {
            return res.status(400).json({ error: 'no_verification_code', message: 'Regenerate a code first.' });
        }
        if (!bioTextContainsVerificationCode(bioText, row.verification_code)) {
            return res.status(400).json({ error: 'code_not_found_in_bio', message: 'Paste the full profile bio that includes your verification code.' });
        }
        const ts = nowIso();
        db.prepare(`UPDATE user_social_links SET bio_verified_at = ? WHERE link_id = ? AND user_id = ?`).run(ts, linkId, uid);
        res.json({ success: true, bioVerifiedAt: ts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/me/social-links/:linkId/regenerate-code — new code + clears bio verification
 */
app.post('/api/me/social-links/:linkId/regenerate-code', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { linkId } = req.params;
        const r = db
            .prepare(`UPDATE user_social_links SET verification_code = ?, bio_verified_at = '' WHERE link_id = ? AND user_id = ?`)
            .run(generateBioVerificationCode(), linkId, uid);
        if (r.changes === 0) return res.status(404).json({ error: 'not_found' });
        const row = db.prepare(`SELECT verification_code FROM user_social_links WHERE link_id = ?`).get(linkId);
        res.json({ verificationCode: row.verification_code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/social/scrape — fetch a public profile URL and return text/meta (basic scraper; no OAuth).
 * Body: { url }
 */
app.post('/api/social/scrape', async (req, res) => {
    try {
        const { url } = req.body || {};
        const out = await scrapePublicProfilePage(url);
        if (!out.ok) {
            return res.status(400).json({ ok: false, error: out.error || 'scrape_failed', url: out.url });
        }
        res.json({
            ok: true,
            url: out.url,
            title: out.title || '',
            ogDescription: out.ogDescription || '',
            textSample: out.textSample || '',
            status: out.status,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /api/social/scrape-check?url= — validate URL without fetching (SSRF guard preview)
 */
app.get('/api/social/scrape-check', (req, res) => {
    const parsed = parseScrapeUrl(req.query.url);
    res.json({ ok: parsed.ok, error: parsed.error || null, url: parsed.url || null });
});

/**
 * POST /api/me/social-links/:linkId/verify-bio-scrape — fetch profile_url, look for bio code (same rules as paste).
 */
app.post('/api/me/social-links/:linkId/verify-bio-scrape', requireSession, async (req, res) => {
    try {
        const uid = req.auth.userId;
        const { linkId } = req.params;
        const row = db.prepare(`SELECT * FROM user_social_links WHERE link_id = ? AND user_id = ?`).get(linkId, uid);
        if (!row) return res.status(404).json({ error: 'not_found' });
        if (row.verified_admin) {
            return res.json({ success: true, bioVerifiedAt: row.bio_verified_at, alreadyVerified: true });
        }
        if (!row.verification_code || !String(row.verification_code).trim()) {
            return res.status(400).json({ error: 'no_verification_code', message: 'Regenerate a code first.' });
        }
        const profileUrl = String(row.profile_url || '').trim();
        if (!profileUrl) {
            return res.status(400).json({
                error: 'no_profile_url',
                message: 'Add a profile URL on this link to enable fetch-verify, or use paste-bio.',
            });
        }
        const scraped = await scrapePublicProfilePage(profileUrl);
        if (!scraped.ok) {
            return res.status(502).json({
                error: 'scrape_failed',
                message: scraped.error || 'Could not fetch profile page',
                url: scraped.url,
            });
        }
        const haystack = `${scraped.title || ''}\n${scraped.ogDescription || ''}\n${scraped.textSample || ''}`;
        if (!bioTextContainsVerificationCode(haystack, row.verification_code)) {
            return res.status(400).json({
                error: 'code_not_found_in_page',
                message: 'Verification code not found in fetched page text. Paste bio manually or fix profile URL.',
            });
        }
        const ts = nowIso();
        db.prepare(`UPDATE user_social_links SET bio_verified_at = ? WHERE link_id = ? AND user_id = ?`).run(ts, linkId, uid);
        res.json({ success: true, bioVerifiedAt: ts, scrapeStatus: scraped.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/me/social-links/:linkId
 */
app.delete('/api/me/social-links/:linkId', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const r = db.prepare(`DELETE FROM user_social_links WHERE link_id = ? AND user_id = ?`).run(req.params.linkId, uid);
        if (r.changes === 0) return res.status(404).json({ error: 'not_found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/public/profile/:userId — Public page data (social handles if user opted in)
 */
app.get('/api/public/profile/:userId', (req, res) => {
    try {
        const uid = req.params.userId;
        const row = db.prepare(`SELECT user_id, username, display_name, bio, show_social_public FROM users WHERE user_id = ?`).get(uid);
        if (!row) return res.status(404).json({ error: 'not_found' });
        const links =
            row.show_social_public
                ? db
                    .prepare(
                        `SELECT platform, handle, profile_url FROM user_social_links WHERE user_id = ? AND is_public = 1
                         AND (verified_admin = 1 OR trim(coalesce(bio_verified_at,'')) != '')
                         ORDER BY created_at ASC`,
                    )
                    .all(uid)
                : [];
        res.json({
            user: {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name || '',
                bio: row.bio || '',
            },
            socialLinks: links,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/logout — Invalidate current session
 */
app.post('/api/auth/logout', (req, res) => {
    const token = parseBearer(req);
    if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    res.json({ success: true });
});

/**
 * POST /api/nfc/tap — record a physical-style NFC tap session (server log alongside in-browser Digital Tap).
 * Body: { targetAgentId, serviceId?, tapChannel?, proof? }
 */
app.post('/api/nfc/tap', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { targetAgentId, serviceId, tapChannel, proof } = req.body || {};
        if (!targetAgentId || typeof targetAgentId !== 'string') {
            return res.status(400).json({ error: 'invalid_payload', required: ['targetAgentId'] });
        }
        const tapId = makeId('tap');
        const proofJson = JSON.stringify(proof && typeof proof === 'object' ? proof : { clientHint: 'tap' });
        db.prepare(
            `
          INSERT INTO nfc_phy_taps (tap_id, initiator_user_id, target_agent_id, service_id, tap_channel, proof_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
            tapId,
            uid,
            String(targetAgentId).slice(0, 128),
            String(serviceId || 'nfc-direct-connection').slice(0, 120),
            String(tapChannel || 'nfc_phy').slice(0, 64),
            proofJson.slice(0, 8000),
            nowIso(),
        );
        res.status(201).json({ tapId, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/nfc/taps — recent taps initiated by the current user
 */
app.get('/api/nfc/taps', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
        const rows = db
            .prepare(
                `
          SELECT tap_id, target_agent_id, service_id, tap_channel, created_at
          FROM nfc_phy_taps
          WHERE initiator_user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
            )
            .all(uid, limit);
        res.json({ taps: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/social/ingest - Upsert a social post proof record
 * Body: { post_id, platform, author_handle, url, content_text?, posted_at, verified, verified_at? }
 */
app.post('/api/social/ingest', (req, res) => {
    try {
        const post = { ...req.body } || {};
        const required = ['post_id', 'platform', 'author_handle', 'url', 'posted_at', 'verified'];
        for (const key of required) {
            if (post[key] === undefined || post[key] === null || post[key] === '') {
                return res.status(400).json({ error: 'invalid_payload', missing: key });
            }
        }
        let verified = !!post.verified;
        if (verified && NFC_SOCIAL_ADMIN_KEY) {
            const hdr = req.get('x-nfc-admin') || req.get('X-NFC-Admin') || '';
            if (hdr !== NFC_SOCIAL_ADMIN_KEY) verified = false;
        }
        ensureSocialPost(db, { ...post, verified });
        let nftRefs = [];
        try {
            nftRefs = syncPostNftRefsFromContent(db, post.post_id).refs;
        } catch (_) {
            nftRefs = [];
        }
        res.status(201).json({ success: true, post_id: post.post_id, verified_persisted: verified, nftRefs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/nft/mint - Mint internal NFT from verified post
 * Body: { userId, post: {post_id,...verified:true}, nftNode?: {title, body}, novelty?: {novelty_score, connectivity} }
 */
app.post('/api/nft/mint', requireSession, (req, res) => {
    try {
        const userId = req.auth.userId;
        const { post, nftNode } = req.body || {};
        if (!post?.post_id) {
            return res.status(400).json({ error: 'invalid_payload', required: ['post.post_id'] });
        }
        ensureSocialPost(db, post);
        const minted = mintNftFromVerifiedPost(db, { userId, post, nftNode });
        try {
            syncPostNftRefsFromContent(db, post.post_id);
        } catch (_) { /* ignore */ }
        const taggingHint = getMintTaggingHint(db, post.post_id, userId);
        res.status(201).json({ success: true, ...minted, taggingHint });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/kimi/translate-graph — Kimi: graph JSON → language (OpenAI when configured)
 */
app.post('/api/kimi/translate-graph', requireSession, async (req, res) => {
    try {
        const uid = req.auth.userId;
        const { intent = 'profile', focusUserId } = req.body || {};
        const target = focusUserId || uid;
        const userRow = db.prepare(`SELECT username, display_name FROM users WHERE user_id = ?`).get(target);
        const label = userRow?.display_name || userRow?.username || target;
        let guides = null;
        try {
            guides = computeUserGuideVectors(db, target);
        } catch (_) {
            guides = null;
        }
        const novelty = computeTutteBarbourNovelty(db, target);
        const epochRow = db.prepare(`SELECT MAX(epoch) AS e FROM node_embeddings`).get();
        const epoch = epochRow?.e ?? 0;
        const barbour = epoch ? db.prepare(`SELECT * FROM barbour_snapshots WHERE epoch = ?`).get(epoch) : null;
        const rep = db.prepare(`SELECT * FROM user_reputation WHERE user_id = ?`).get(target);

        const payload = {
            intent,
            userId: target,
            novelty,
            guides,
            barbourLatest: barbour,
            reputation: rep || null,
        };
        const out = await aiService.kimiGraphTranslate({ graphPayload: payload, username: label, intent });
        res.json({ ...out, payloadSummary: { epoch, hasGuides: !!guides } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/kimi/joint-sessions — Sessions you host or have posted in
 */
app.get('/api/kimi/joint-sessions', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const rows = db
            .prepare(
                `
      SELECT * FROM (
        SELECT * FROM joint_kimi_sessions WHERE host_user_id = ?
        UNION
        SELECT s.* FROM joint_kimi_sessions s
        INNER JOIN joint_kimi_messages m ON m.session_id = s.session_id
        WHERE m.user_id = ?
      )
      ORDER BY created_at DESC
      LIMIT 80
    `,
            )
            .all(uid, uid);
        res.json({ sessions: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/kimi/joint-sessions — Perspectival joint chat room (graph-tagged)
 */
app.post('/api/kimi/joint-sessions', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { title = 'Joint perspective', perspectiveNote = '' } = req.body || {};
        const epochRow = db.prepare(`SELECT MAX(epoch) AS e FROM node_embeddings`).get();
        const epoch = epochRow?.e ?? 0;
        const sid = makeId('kimi');
        db.prepare(
            `
      INSERT INTO joint_kimi_sessions (session_id, host_user_id, title, perspective_note, graph_epoch, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
        ).run(sid, uid, String(title).slice(0, 200), String(perspectiveNote).slice(0, 2000), epoch, nowIso());
        res.status(201).json({ sessionId: sid, graphEpoch: epoch });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/kimi/joint-sessions/:sessionId/messages
 */
app.post('/api/kimi/joint-sessions/:sessionId/messages', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const { sessionId } = req.params;
        const { body = '', role = 'participant' } = req.body || {};
        const sess = db.prepare(`SELECT session_id FROM joint_kimi_sessions WHERE session_id = ?`).get(sessionId);
        if (!sess) return res.status(404).json({ error: 'session_not_found' });
        const mid = makeId('kmsg');
        db.prepare(
            `
      INSERT INTO joint_kimi_messages (message_id, session_id, user_id, role, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
        ).run(mid, sessionId, uid, String(role).slice(0, 32), String(body).slice(0, 8000), nowIso());
        res.status(201).json({ messageId: mid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/kimi/joint-sessions/:sessionId — transcript
 */
app.get('/api/kimi/joint-sessions/:sessionId', requireSession, (req, res) => {
    try {
        const { sessionId } = req.params;
        const sess = db.prepare(`SELECT * FROM joint_kimi_sessions WHERE session_id = ?`).get(sessionId);
        if (!sess) return res.status(404).json({ error: 'session_not_found' });
        const messages = db
            .prepare(
                `SELECT message_id, user_id, role, body, created_at FROM joint_kimi_messages WHERE session_id = ? ORDER BY created_at ASC`,
            )
            .all(sessionId);
        res.json({ session: sess, messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/nft/list - Create a listing for an internal NFT
 * Body: { tokenId, sellerUserId, priceCents, currency? }
 */
app.post('/api/nft/list', requireSession, (req, res) => {
    try {
        const sellerUserId = req.auth.userId;
        const { tokenId, priceCents, currency } = req.body || {};
        if (!tokenId || !Number.isInteger(priceCents)) {
            return res.status(400).json({ error: 'invalid_payload', required: ['tokenId', 'priceCents(int)'] });
        }
        const out = listNft(db, { tokenId, sellerUserId, priceCents, currency });
        res.status(201).json({ success: true, ...out });
    } catch (err) {
        const code = err.message === 'not_owner' ? 403 : 500;
        res.status(code).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/nft/listings - List active internal NFT listings
 */
app.get('/api/nft/listings', (req, res) => {
    try {
        const listings = db.prepare(`
            SELECT listing_id, token_id, seller_user_id, price_cents, currency, status, created_at
            FROM nft_listings
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 200
        `).all();
        res.json({ listings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/nft/purchase - Purchase a listing (profit event)
 * Body: { listingId, buyerUserId }
 */
app.post('/api/nft/purchase', requireSession, (req, res) => {
    try {
        const buyerUserId = req.auth.userId;
        const { listingId } = req.body || {};
        if (!listingId) {
            return res.status(400).json({ error: 'invalid_payload', required: ['listingId'] });
        }
        const receipt = purchaseListing(db, { listingId, buyerUserId, platformFeeBps: PLATFORM_FEE_BPS });
        res.status(201).json({ success: true, receipt });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/identity/:tokenId/nrr-ledger — Temporal NRR identity (genesis + observations + mutations). Read-only.
 */
app.get('/api/identity/:tokenId/nrr-ledger', (req, res) => {
    try {
        const ledger = getNrrLedger(db, req.params.tokenId);
        if (!ledger) return res.status(404).json({ error: 'not_found' });
        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/nft/inventory — NFTs owned by the authenticated user (Buys override mint lineage)
 */
app.get('/api/nft/inventory', requireSession, (req, res) => {
    try {
        const uid = req.auth.userId;
        const rows = db.prepare(`
          SELECT token_id, node_id, minted_by_user_id,
                 TRIM(COALESCE(current_owner_user_id,'')) AS co,
                 acquisition_source, last_purchase_id, minted_at, is_face_nft,
                 TRIM(COALESCE(nrr_genesis_digest,'')) AS nrr_genesis_digest
          FROM nft_tokens
          WHERE TRIM(COALESCE(current_owner_user_id,'')) = ?
             OR (TRIM(COALESCE(current_owner_user_id,'')) = '' AND minted_by_user_id = ?)
        `).all(uid, uid);
        const nfts = rows.map((r) => ({
            tokenId: r.token_id,
            nodeId: r.node_id,
            mintedByUserId: r.minted_by_user_id,
            currentOwnerUserId: r.co || r.minted_by_user_id,
            acquisitionSource: r.acquisition_source,
            lastPurchaseId: r.last_purchase_id,
            mintedAt: r.minted_at,
            isFaceNft: !!r.is_face_nft,
            nrrGenesisDigest: r.nrr_genesis_digest || '',
            identityKind: 'temporal_nrr',
        }));
        res.json({ nfts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/init - Initialize all agent wallets
 * Call this once on startup to derive wallets from mnemonic
 */
app.post('/api/init', async (req, res) => {
    try {
        const agentIds = AGENTS.map(a => a.id);
        const walletInfo = await walletManager.initialize(
            process.env.AGENT_MNEMONIC,
            agentIds
        );
        isInitialized = true;
        res.json({
            success: true,
            wallets: walletInfo,
            message: 'All agent wallets initialized on Base Sepolia'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/wallets - Get all wallet addresses and balances
 */
app.get('/api/wallets', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized. POST /api/init first.' });
    }
    try {
        const balances = await walletManager.getAllBalances();
        res.json({ wallets: balances });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/wallets/:agentId/balance - Get single agent balance
 */
app.get('/api/wallets/:agentId/balance', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    try {
        const balance = await walletManager.getBalance(req.params.agentId);
        const info = walletManager.getWalletInfo()[req.params.agentId];
        res.json({ agentId: req.params.agentId, balanceEth: balance, address: info?.address });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/tx/send - Send a REAL on-chain transaction between agents
 * Body: { from: "node-1", to: "node-3", amountEth: "0.0001", memo: "POI:..." }
 */
app.post('/api/tx/send', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, to, amountEth, memo } = req.body;
    if (!from || !to || !amountEth) {
        return res.status(400).json({ error: 'Missing from, to, or amountEth' });
    }

    try {
        const result = await walletManager.sendTransaction(from, to, amountEth, memo || '');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/tx/external - Send to an EXTERNAL wallet (outside the network)
 * Body: { from: "node-1", toAddress: "0x...", amountEth: "0.001", memo: "..." }
 */
app.post('/api/tx/external', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, toAddress, amountEth, memo } = req.body;
    if (!from || !toAddress || !amountEth) {
        return res.status(400).json({ error: 'Missing from, toAddress, or amountEth' });
    }

    try {
        const result = await walletManager.sendToExternal(from, toAddress, amountEth, memo || '');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/tx/verify/:txHash - Verify a transaction on-chain
 */
app.get('/api/tx/verify/:txHash', async (req, res) => {
    try {
        const result = await walletManager.verifyTransaction(req.params.txHash);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tx/history - Get all transaction history
 */
app.get('/api/tx/history', (req, res) => {
    res.json({ transactions: walletManager.getTransactionHistory() });
});

/**
 * POST /api/ai/fulfill - Fulfill a service using REAL AI (OpenAI)
 * Body: { agentId: "node-1", serviceName: "Barista Training", prompt: "..." }
 */
app.post('/api/ai/fulfill', async (req, res) => {
    const { agentId, serviceName, prompt } = req.body;
    if (!agentId || !serviceName) {
        return res.status(400).json({ error: 'Missing agentId or serviceName' });
    }

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
        return res.status(404).json({ error: `Agent ${agentId} not found` });
    }

    try {
        const result = await aiService.fulfill(agent.name, agent.role, serviceName, prompt);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/ai/usage - Get AI usage statistics
 */
app.get('/api/ai/usage', (req, res) => {
    res.json(aiService.getUsageStats());
});

/**
 * POST /api/asin/resolve - Resolve an ASIN + return an affiliate link
 * Body: { region, description, asin?, tag? }
 */
app.post('/api/asin/resolve', async (req, res) => {
    try {
        const {
            region = 'US',
            description,
            asin = 'B00949CTQQ',
            tag = process.env.AMAZON_AFFILIATE_TAG || 'ratemyface0a-20'
        } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Missing description' });
        }

        const { affiliate_link, tld } = buildAffiliateLink({ region, asin, tag });

        res.json({
            asin,
            title: "Paula's Choice SKIN PERFECTING 2% BHA Liquid Exfoliant",
            affiliate_link,
            region,
            tld,
            verified_url: true,
            source: 'curated',
            debug: {
                description
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/poi/record - Record a Proof of Interaction on-chain
 * This encodes the IVI audit result as a transaction memo
 * Body: { from, to, score, closureData, amountEth }
 */
app.post('/api/poi/record', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, to, score, closureData, amountEth } = req.body;

    // Encode POI data as memo
    const poiMemo = JSON.stringify({
        protocol: 'TAP-POI-v1',
        score: score,
        closure: closureData,
        timestamp: Date.now()
    });

    try {
        const result = await walletManager.sendTransaction(
            from, to,
            amountEth || '0.000001', // Minimal ETH for POI stamp
            poiMemo
        );
        res.json({
            ...result,
            poiData: poiMemo,
            isProofOfInteraction: true
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/engine/recompute - Recompute Tutte embedding + faces + alpha reputation
 * Body: { seedNodeId?, radius? }
 */
app.post('/api/engine/recompute', requireSession, (req, res) => {
    try {
        const { seedNodeId, radius } = req.body || {};
        const seed = seedNodeId || null;
        const r = Number.isInteger(radius) ? radius : 2;
        const result = computeTutteEmbedding(db, { seedNodeId: seed, radius: r });
        let updatedUsers = 0;
        if (result.persisted && result.epoch) {
            const rep = updateUserReputationFromEpoch(db, { epoch: result.epoch, positions: result.positions });
            updatedUsers = rep.updatedUsers;
            db.prepare(`
                UPDATE barbour_snapshots
                SET alpha_mean = (SELECT COALESCE(AVG(alpha), 0) FROM user_reputation)
                WHERE epoch = ?
            `).run(result.epoch);
            appendNrrEpochObservations(db, result.epoch);
        }
        res.status(seed ? 200 : 201).json({
            success: true,
            epoch: result.epoch,
            persisted: !!result.persisted,
            stress: result.stress,
            faceCount: result.faces.length,
            barbour: result.barbour || null,
            updatedUsers
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/tutte/global — Latest persisted global Tutte + graph + NFT face flags + interconnects
 */
app.get('/api/tutte/global', (req, res) => {
    try {
        const row = db.prepare(`SELECT MAX(epoch) AS e FROM node_embeddings`).get();
        const epoch = row?.e ?? 0;
        if (!epoch) {
            return res.json({
                epoch: 0,
                nodes: [],
                edges: [],
                positions: [],
                nfts: [],
                interconnects: [],
                barbour: null
            });
        }
        const positions = db.prepare(`
            SELECT node_id, x, y, stress FROM node_embeddings WHERE epoch = ?
        `).all(epoch);
        const nodes = db.prepare(`
            SELECT node_id, node_type, title, owner_user_id FROM graph_nodes
        `).all();
        const edges = db.prepare(`
            SELECT edge_id, from_node_id, to_node_id, edge_type, weight FROM graph_edges
        `).all();
        const nfts = db.prepare(`
            SELECT token_id, node_id, is_face_nft, face_cycle_key, minted_by_user_id,
                   TRIM(COALESCE(current_owner_user_id,'')) AS current_owner_user_id,
                   acquisition_source
            FROM nft_tokens
        `).all();
        const interconnects = db.prepare(`
            SELECT link_id, from_token_id, to_token_id, link_type, meta_json, created_at,
                   COALESCE(route_highlight, 1) AS route_highlight,
                   vitiated_reason, vitiated_at
            FROM nft_interconnects ORDER BY created_at DESC LIMIT 500
        `).all();
        const barbour = db.prepare(`SELECT * FROM barbour_snapshots WHERE epoch = ?`).get(epoch);
        const guideUserId = req.query.guideUserId || req.query.userId;
        let userGuides = null;
        if (guideUserId) {
            try {
                userGuides = computeUserGuideVectors(db, String(guideUserId));
            } catch (_) {
                userGuides = null;
            }
        }
        res.json({ epoch, nodes, edges, positions, nfts, interconnects, barbour, userGuides });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tutte/guides/:userId — Primary / secondary guide vectors + prime-wheel neighbor buckets
 */
app.get('/api/tutte/guides/:userId', (req, res) => {
    try {
        const guides = computeUserGuideVectors(db, req.params.userId);
        res.json(guides);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tutte/perspectival-paths — User centroids over epochs (global map light curves)
 */
app.get('/api/tutte/perspectival-paths', (req, res) => {
    try {
        const maxUsers = Math.min(64, Math.max(1, parseInt(req.query.maxUsers || '24', 10)));
        const out = computePerspectivalPaths(db, { maxUsers });
        res.json(out);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tutte/nft/:tokenId/temporal — Node positions across epochs for one NFT
 */
app.get('/api/tutte/nft/:tokenId/temporal', (req, res) => {
    try {
        const trail = computeNftTemporalTrail(db, req.params.tokenId);
        if (!trail) return res.status(404).json({ error: 'not_found' });
        res.json(trail);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/graph/connect/preview — Collapsed faces + projected α change (Barbour complexity + guide alignment)
 */
app.post('/api/graph/connect/preview', requireSession, (req, res) => {
    try {
        const userId = req.auth.userId;
        const { fromNodeId, toNodeId } = req.body || {};
        if (!fromNodeId || !toNodeId) {
            return res.status(400).json({ error: 'invalid_payload', required: ['fromNodeId', 'toNodeId'] });
        }
        const out = previewConnectionImpact(db, { userId, fromNodeId, toNodeId });
        if (!out.ok) return res.status(400).json(out);
        res.json(out);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/graph/connect — Add edge; user must own fromNodeId; α updated from face-collapse + guide alignment
 */
app.post('/api/graph/connect', requireSession, (req, res) => {
    try {
        const userId = req.auth.userId;
        const { fromNodeId, toNodeId, edgeType } = req.body || {};
        if (!fromNodeId || !toNodeId) {
            return res.status(400).json({ error: 'invalid_payload', required: ['fromNodeId', 'toNodeId'] });
        }
        const out = applyConnectionWithCollapse(db, { userId, fromNodeId, toNodeId, edgeType });
        if (!out.ok) return res.status(400).json(out);
        res.status(201).json(out);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tutte/nft/:tokenId/overlay — Local Tutte around NFT vs coordinates on latest global epoch
 */
app.get('/api/tutte/nft/:tokenId/overlay', (req, res) => {
    try {
        const { tokenId } = req.params;
        const tok = db.prepare(`
            SELECT token_id, node_id, is_face_nft, face_cycle_key FROM nft_tokens WHERE token_id = ?
        `).get(tokenId);
        if (!tok) return res.status(404).json({ error: 'not_found' });

        const epochRow = db.prepare(`SELECT MAX(epoch) AS e FROM node_embeddings`).get();
        const gEpoch = epochRow?.e ?? 0;
        const globalPosRows = gEpoch
            ? db.prepare(`SELECT node_id, x, y FROM node_embeddings WHERE epoch = ?`).all(gEpoch)
            : [];
        const globalPos = new Map(globalPosRows.map((r) => [r.node_id, { x: r.x, y: r.y }]));

        const local = runTutteRelaxation(db, {
            seedNodeId: tok.node_id,
            radius: 3,
            maxIters: 100,
            omega: 0.85
        });

        const nftNodeSet = new Set(
            db.prepare(`SELECT node_id FROM nft_tokens`).all().map((r) => r.node_id)
        );
        const localNftOnFaces = local.faces.map((f) => ({
            cycle: f.cycle,
            area: f.area,
            nftNodeCount: f.cycle.filter((nid) => nftNodeSet.has(nid)).length
        }));

        const overlayNodes = local.ids.map((nodeId) => ({
            nodeId,
            local: local.positions.get(nodeId),
            global: globalPos.get(nodeId) || null
        }));

        res.json({
            tokenId: tok.token_id,
            globalEpoch: gEpoch,
            isFaceNftOnGlobal: !!tok.is_face_nft,
            faceCycleKey: tok.face_cycle_key || '',
            localStress: local.stress,
            localFaceCount: local.faces.length,
            overlayNodes,
            localFaces: localNftOnFaces.slice(0, 24)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/barbour/history — Barbour shape-sphere metrics over epochs
 */
app.get('/api/barbour/history', (req, res) => {
    try {
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '60', 10)));
        const rows = db.prepare(`
            SELECT epoch, stress, node_count, face_count, sphere_radius,
                   centroid_x, centroid_y, centroid_z, alpha_mean, computed_at
            FROM barbour_snapshots
            ORDER BY epoch DESC
            LIMIT ?
        `).all(limit);
        res.json({ snapshots: rows.reverse() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/nft/interconnect — Face NFTs only: link contracts / comms / tx intent between tokens
 */
app.post('/api/nft/interconnect', requireSession, (req, res) => {
    try {
        const { fromTokenId, toTokenId, linkType, meta } = req.body || {};
        if (!fromTokenId || !toTokenId || !linkType) {
            return res.status(400).json({ error: 'invalid_payload', required: ['fromTokenId', 'toTokenId', 'linkType'] });
        }
        if (fromTokenId === toTokenId) {
            return res.status(400).json({ error: 'same_token' });
        }
        const a = db.prepare(`
          SELECT is_face_nft, minted_by_user_id,
                 TRIM(COALESCE(current_owner_user_id,'')) AS current_owner_user_id
          FROM nft_tokens WHERE token_id = ?
        `).get(fromTokenId);
        const b = db.prepare(`SELECT is_face_nft FROM nft_tokens WHERE token_id = ?`).get(toTokenId);
        if (!a || !b) return res.status(404).json({ error: 'token_not_found' });
        const fromOwner = effectiveNftOwnerRow(a);
        if (fromOwner !== req.auth.userId) {
            return res.status(403).json({ error: 'not_owner_of_from_token' });
        }
        const faceA = !!a.is_face_nft;
        const faceB = !!b.is_face_nft;
        const payInadmissibleTax = !!req.body?.payInadmissibleTax;

        if ((!faceA || !faceB) && !payInadmissibleTax) {
            return res.status(403).json({
                error: 'not_face_admissible',
                message:
                    'Both endpoints should be Tutte face-admissible for free joint routes. Or set payInadmissibleTax to pay an α tax and still open the link.',
                taxAlpha: NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA,
            });
        }

        if ((!faceA || !faceB) && payInadmissibleTax) {
            applyInadmissibleInterconnectTax(db, req.auth.userId, NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA);
            recordInadmissibleTaxPerspectivalDomain(db, {
                payerUserId: req.auth.userId,
                fromTokenId,
                toTokenId,
                taxAlpha: NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA,
            });
        }

        const linkId = makeId('link');
        const metaObj =
            meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {};
        if ((!faceA || !faceB) && payInadmissibleTax) {
            metaObj.inadmissibleTaxAlpha = NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA;
        }
        const routeHighlight = faceA && faceB ? 1 : 0;
        const metaJson = JSON.stringify(metaObj);
        db.prepare(`
            INSERT INTO nft_interconnects (
              link_id, from_token_id, to_token_id, link_type, meta_json, created_at,
              route_highlight, vitiated_reason, vitiated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, '', '')
        `).run(linkId, fromTokenId, toTokenId, linkType, metaJson, nowIso(), routeHighlight);
        res.status(201).json({
            success: true,
            linkId,
            inadmissibleTaxPaid:
                (!faceA || !faceB) && payInadmissibleTax ? NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA : 0,
            routeHighlight,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/nft/score-candidate - Score connectivity (and return latest engine stress/epoch)
 * Body: { candidateNodeId, radius? }
 */
app.post('/api/nft/score-candidate', (req, res) => {
    try {
        const { candidateNodeId, radius } = req.body || {};
        if (!candidateNodeId) {
            return res.status(400).json({ error: 'invalid_payload', required: ['candidateNodeId'] });
        }
        const score = scoreCandidateConnectivity(db, { candidateNodeId, radius: Number.isInteger(radius) ? radius : 3 });
        const latest = db.prepare(`SELECT COALESCE(MAX(epoch), 0) AS e FROM node_embeddings`).get();
        const epoch = latest?.e ?? 0;
        const stressRow = epoch
            ? db.prepare(`SELECT stress FROM node_embeddings WHERE epoch = ? LIMIT 1`).get(epoch)
            : null;
        res.json({ epoch, stress: stressRow?.stress ?? 0, ...score });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/nft/:tokenId/image.svg - SVG face-image derived from latest Tutte faces
 */
app.get('/api/nft/:tokenId/image.svg', (req, res) => {
    try {
        const { tokenId } = req.params;
        const tok = db.prepare(`
            SELECT t.token_id, t.node_id, n.title
            FROM nft_tokens t
            LEFT JOIN graph_nodes n ON n.node_id = t.node_id
            WHERE t.token_id = ?
        `).get(tokenId);
        if (!tok) return res.status(404).send('not_found');

        const result = runTutteRelaxation(db, { seedNodeId: tok.node_id, radius: 2, maxIters: 120, omega: 0.8 });
        const positions = result.positions;
        const faces = result.faces || [];

        const svg = renderNftFacesSvg({
            tokenId: tok.token_id,
            title: tok.title || tok.token_id,
            faces,
            positions
        });
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(svg);
    } catch (err) {
        res.status(500).send(String(err.message || err));
    }
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║       TAP Network — Real Economy Server       ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║  Server:    http://localhost:${PORT}             ║`);
    console.log('║  Chain:     Base Sepolia (84532)              ║');
    console.log('║  AI Model:  gpt-4o-mini                      ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    // Auto-initialize wallets on startup
    try {
        const agentIds = AGENTS.map(a => a.id);
        const walletInfo = await walletManager.initialize(
            process.env.AGENT_MNEMONIC,
            agentIds
        );
        isInitialized = true;
        console.log('\n✅ Server ready. All wallets initialized.');
        console.log(`   Treasury: ${process.env.TREASURY_ADDRESS}`);
        console.log(`   Explorer: https://sepolia.basescan.org\n`);
    } catch (err) {
        console.error('⚠️  Wallet initialization failed:', err.message);
        console.log('   Server running but wallets need manual init via POST /api/init');
    }
});
