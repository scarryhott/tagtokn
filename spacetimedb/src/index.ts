/**
 * NFC / TAP — SpacetimeDB module (TypeScript).
 * Publish: from repo root, with CLI installed: `spacetime publish nfc-tap -p spacetimedb -y`
 * Local server: `docker run --rm -p 3000:3000 clockworklabs/spacetime:latest start` or `spacetime start`
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

const db = schema({ nfcLivePing });

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

export default db;
