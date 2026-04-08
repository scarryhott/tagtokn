import crypto from 'crypto';
import { id as makeId, nowIso } from './ids.js';

const NFT_TOKEN_RE = /nft_[a-f0-9]{32}/gi;

/** Unique string the user must place in that platform’s profile bio, then confirm via paste. */
export function generateBioVerificationCode() {
  return `NFC-${crypto.randomBytes(8).toString('hex')}`;
}

export function bioTextContainsVerificationCode(bioText, code) {
  const c = String(code || '').trim().toLowerCase();
  if (c.length < 8) return false;
  const t = String(bioText || '').toLowerCase();
  return t.includes(c);
}

/** Bio proof done, or legacy admin override. */
export function socialLinkIsVerified(row) {
  if (!row) return false;
  if (row.verified_admin) return true;
  return !!(row.bio_verified_at && String(row.bio_verified_at).trim());
}

export function normalizeHandle(h) {
  return String(h || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export function extractNftTokenIds(text) {
  if (!text) return [];
  const s = String(text);
  const out = new Set();
  let m;
  const re = new RegExp(NFT_TOKEN_RE);
  while ((m = re.exec(s)) !== null) {
    out.add(m[0].toLowerCase());
  }
  return [...out];
}

/**
 * Record NFT token references in post body/URL and whether author aligns with minter's linked socials (same platform + handle).
 */
export function syncPostNftRefsFromContent(db, postId) {
  const post = db.prepare(`SELECT * FROM social_posts WHERE post_id = ?`).get(postId);
  if (!post) return { refs: [] };

  const hay = `${post.content_text || ''}\n${post.url || ''}`;
  const tokenIds = extractNftTokenIds(hay);
  const author = normalizeHandle(post.author_handle);
  const platform = String(post.platform || '').toLowerCase();

  const out = [];
  for (const tokenId of tokenIds) {
    const tok = db.prepare(`SELECT token_id, minted_by_user_id FROM nft_tokens WHERE token_id = ?`).get(tokenId);
    if (!tok) continue;

    const links = db
      .prepare(
        `
      SELECT handle FROM user_social_links
      WHERE user_id = ? AND is_public = 1
        AND lower(platform) = ?
        AND (verified_admin = 1 OR trim(coalesce(bio_verified_at,'')) != '')
    `,
      )
      .all(tok.minted_by_user_id, platform);

    let authorMatches = 0;
    for (const row of links) {
      if (normalizeHandle(row.handle) === author) {
        authorMatches = 1;
        break;
      }
    }

    db.prepare(`DELETE FROM social_post_nft_refs WHERE post_id = ? AND token_id = ?`).run(postId, tokenId);

    const refId = makeId('tag');
    db.prepare(
      `
      INSERT INTO social_post_nft_refs (ref_id, post_id, token_id, platform, author_handle_norm, author_matches_linked_identity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(refId, postId, tokenId, platform, author, authorMatches, nowIso());

    out.push({ tokenId, authorMatchesLinkedIdentity: !!authorMatches });
  }

  return { refs: out };
}

export function getMintTaggingHint(db, postId, minterUserId) {
  const post = db.prepare(`SELECT author_handle, platform, content_text, url FROM social_posts WHERE post_id = ?`).get(postId);
  const refs = db
    .prepare(`SELECT token_id, author_matches_linked_identity FROM social_post_nft_refs WHERE post_id = ?`)
    .all(postId);

  const links = db
    .prepare(
      `
    SELECT platform, handle FROM user_social_links
    WHERE user_id = ? AND is_public = 1
      AND (verified_admin = 1 OR trim(coalesce(bio_verified_at,'')) != '')
  `,
    )
    .all(minterUserId);

  let handleLinked = 0;
  if (post) {
    const ah = normalizeHandle(post.author_handle);
    const pf = String(post.platform || '').toLowerCase();
    for (const l of links) {
      if (String(l.platform || '').toLowerCase() === pf && normalizeHandle(l.handle) === ah) {
        handleLinked = 1;
        break;
      }
    }
  }

  const inContent = post ? extractNftTokenIds(`${post.content_text || ''}\n${post.url || ''}`) : [];

  return {
    linkedAuthorMatchesPlatform: !!handleLinked,
    tokenIdsMentionedInPost: inContent,
    crossRefsToOtherTokens: refs,
  };
}
