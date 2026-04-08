import { id, nowIso } from './ids.js';
import { computeTutteBarbourNovelty } from './novelty-tutte.js';

function feeFromBps(priceCents, feeBps) {
  const fee = Math.floor((priceCents * feeBps) / 10000);
  return { feeCents: fee, proceedsCents: priceCents - fee };
}

export function ensureSocialPost(db, post) {
  const stmt = db.prepare(`
    INSERT INTO social_posts (post_id, platform, author_handle, url, content_text, posted_at, verified, verified_at)
    VALUES (@post_id, @platform, @author_handle, @url, @content_text, @posted_at, @verified, @verified_at)
    ON CONFLICT(post_id) DO UPDATE SET
      platform=excluded.platform,
      author_handle=excluded.author_handle,
      url=excluded.url,
      content_text=excluded.content_text,
      posted_at=excluded.posted_at,
      verified=excluded.verified,
      verified_at=excluded.verified_at
  `);
  stmt.run({
    post_id: post.post_id,
    platform: post.platform,
    author_handle: post.author_handle,
    url: post.url,
    content_text: post.content_text ?? '',
    posted_at: post.posted_at,
    verified: post.verified ? 1 : 0,
    verified_at: post.verified_at ?? '',
  });
}

export function mintNftFromVerifiedPost(db, { userId, post, nftNode, novelty: _noveltyIgnored }) {
  if (!post?.verified) throw new Error('post_not_verified');
  const mintedAt = nowIso();

  const geo = computeTutteBarbourNovelty(db, userId);
  const noveltyScore = geo.noveltyScore;
  const connectivity = geo.connectivity;

  const nodeId = nftNode?.node_id ?? id('node');
  db.prepare(`
    INSERT INTO graph_nodes (node_id, node_type, title, body, owner_user_id, source_ref, created_at)
    VALUES (?, 'nft', ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    nftNode?.title ?? '',
    nftNode?.body ?? '',
    userId,
    `social_post:${post.post_id}`,
    mintedAt
  );

  const tokenId = id('nft');
  db.prepare(`
    INSERT INTO nft_tokens (
      token_id, node_id, minted_from_post_id, minted_by_user_id, novelty_score, connectivity, minted_at,
      current_owner_user_id, acquisition_source, last_purchase_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mint', '')
  `).run(
    tokenId,
    nodeId,
    post.post_id,
    userId,
    noveltyScore,
    connectivity,
    mintedAt,
    userId,
  );

  return { tokenId, nodeId, mintedAt, graphNovelty: geo };
}

export function listNft(db, { tokenId, sellerUserId, priceCents, currency = 'USD' }) {
  const tok = db.prepare(`
    SELECT token_id,
           minted_by_user_id,
           TRIM(COALESCE(current_owner_user_id, '')) AS owner_raw
    FROM nft_tokens WHERE token_id = ?
  `).get(tokenId);
  if (!tok) throw new Error('token_not_found');
  const effectiveOwner = tok.owner_raw || tok.minted_by_user_id;
  if (effectiveOwner !== sellerUserId) throw new Error('not_owner');

  const listingId = id('listing');
  db.prepare(`
    INSERT INTO nft_listings (listing_id, token_id, seller_user_id, price_cents, currency, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `).run(listingId, tokenId, sellerUserId, priceCents, currency, nowIso());
  return { listingId };
}

export function purchaseListing(db, { listingId, buyerUserId, platformFeeBps }) {
  const listing = db.prepare(`
    SELECT l.listing_id, l.token_id, l.seller_user_id, l.price_cents, l.status,
           t.node_id AS token_node_id,
           t.minted_by_user_id,
           TRIM(COALESCE(t.current_owner_user_id, '')) AS owner_raw
    FROM nft_listings l
    JOIN nft_tokens t ON t.token_id = l.token_id
    WHERE l.listing_id = ?
  `).get(listingId);

  if (!listing) throw new Error('listing_not_found');
  if (listing.status !== 'active') throw new Error('listing_not_active');
  if (listing.seller_user_id === buyerUserId) throw new Error('cannot_buy_own_listing');

  const effectiveOwner = listing.owner_raw || listing.minted_by_user_id;
  if (listing.seller_user_id !== effectiveOwner) throw new Error('listing_stale_relist');

  const { feeCents, proceedsCents } = feeFromBps(listing.price_cents, platformFeeBps);
  const purchaseId = id('purchase');
  const purchasedAt = nowIso();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE nft_listings
      SET status = 'sold'
      WHERE listing_id = ?
    `).run(listingId);

    db.prepare(`
      INSERT INTO nft_purchases (
        purchase_id, listing_id, token_id, buyer_user_id, seller_user_id,
        price_cents, platform_fee_bps, platform_fee_cents, seller_proceeds_cents, purchased_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      purchaseId,
      listing.listing_id,
      listing.token_id,
      buyerUserId,
      listing.seller_user_id,
      listing.price_cents,
      platformFeeBps,
      feeCents,
      proceedsCents,
      purchasedAt
    );

    db.prepare(`
      UPDATE nft_tokens
      SET current_owner_user_id = ?,
          acquisition_source = 'purchase',
          last_purchase_id = ?
      WHERE token_id = ?
    `).run(buyerUserId, purchaseId, listing.token_id);

    db.prepare(`
      UPDATE graph_nodes SET owner_user_id = ? WHERE node_id = ?
    `).run(buyerUserId, listing.token_node_id);
  });
  tx();

  return {
    purchaseId,
    tokenId: listing.token_id,
    sellerUserId: listing.seller_user_id,
    buyerUserId,
    priceCents: listing.price_cents,
    platformFeeBps,
    platformFeeCents: feeCents,
    sellerProceedsCents: proceedsCents,
    purchasedAt,
  };
}

