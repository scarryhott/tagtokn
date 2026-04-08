/**
 * NFC / TAP — SpacetimeDB module (TypeScript).
 * Publish: `spacetime publish nfc-tap -p spacetimedb -y`
 */
import { schema, table, t } from 'spacetimedb/server';

const nfcLivePing = table(
  { name: 'nfc_live_ping', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sender: t.identity(),
    body: t.string(),
    postedAt: t.timestamp(),
  }
);

/** Public read model for graph NFTs — ownership enforced by Spacetime identity. */
const publicGraphNft = table(
  { name: 'public_graph_nft', public: true },
  {
    tokenId: t.string().primaryKey(),
    owner: t.identity(),
    ownerUserId: t.string(),
    nodeId: t.string(),
    title: t.string(),
    body: t.string(),
    listed: t.bool(),
    priceCents: t.u64(),
    updatedAt: t.timestamp(),
  }
);

const db = schema({ nfcLivePing, publicGraphNft });

export const post_live_ping = db.reducer(
  { body: t.string() },
  (ctx, { body }) => {
    const text = body.length > 500 ? body.slice(0, 500) : body;
    ctx.db.nfcLivePing.insert({
      sender: ctx.sender,
      body: text,
      postedAt: ctx.timestamp,
    });
  }
);

function findPublicNft(ctx: { db: { publicGraphNft: { iter(): Iterable<{ tokenId: string }> } } }, tokenId: string) {
  for (const row of ctx.db.publicGraphNft.iter()) {
    if (row.tokenId === tokenId) return row;
  }
  return null;
}

export const register_public_graph_nft = db.reducer(
  {
    tokenId: t.string(),
    ownerUserId: t.string(),
    nodeId: t.string(),
    title: t.string(),
    body: t.string(),
  },
  (ctx, p) => {
    const tokenId = p.tokenId.slice(0, 200);
    const title = p.title.slice(0, 500);
    const body = p.body.slice(0, 4000);
    const nodeId = p.nodeId.slice(0, 200);
    const ownerUserId = p.ownerUserId.slice(0, 120);
    const existing = findPublicNft(ctx, tokenId);
    if (existing) {
      if (!existing.owner.isEqual(ctx.sender)) {
        throw new Error('not_owner');
      }
      ctx.db.publicGraphNft.delete(existing);
    }
    ctx.db.publicGraphNft.insert({
      tokenId,
      owner: ctx.sender,
      ownerUserId,
      nodeId,
      title,
      body,
      listed: false,
      priceCents: 0n,
      updatedAt: ctx.timestamp,
    });
  }
);

export const set_public_graph_nft_listing = db.reducer(
  {
    tokenId: t.string(),
    listed: t.bool(),
    priceCents: t.u64(),
  },
  (ctx, p) => {
    const tokenId = p.tokenId.slice(0, 200);
    const existing = findPublicNft(ctx, tokenId);
    if (!existing || !existing.owner.isEqual(ctx.sender)) {
      throw new Error('not_owner');
    }
    ctx.db.publicGraphNft.delete(existing);
    ctx.db.publicGraphNft.insert({
      tokenId: existing.tokenId,
      owner: existing.owner,
      ownerUserId: existing.ownerUserId,
      nodeId: existing.nodeId,
      title: existing.title,
      body: existing.body,
      listed: p.listed,
      priceCents: p.priceCents,
      updatedAt: ctx.timestamp,
    });
  }
);

export default db;
