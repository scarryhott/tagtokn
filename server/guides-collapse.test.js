import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, initDb } from './db.js';
import { vitiateJointRoutesForCollapsedFaces } from './guides-collapse.js';
import { nowIso } from './ids.js';

describe('collapse vitiates joint routes', () => {
  let db;

  beforeEach(() => {
    db = openDb({ filename: ':memory:' });
    initDb(db);
    const t = nowIso();
    const postId = `p-${Date.now()}`;
    db.prepare(
      `INSERT INTO social_posts (post_id, platform, author_handle, url, content_text, posted_at, verified, verified_at)
       VALUES (?, 'x', 'h', '', '', ?, 1, ?)`,
    ).run(postId, t, t);
    db.prepare(
      `INSERT INTO graph_nodes (node_id, node_type, title, body, owner_user_id, source_ref, created_at)
       VALUES ('n-a', 'user', '', '', 'u1', '', ?), ('n-b', 'user', '', '', 'u1', '', ?), ('n-c', 'user', '', '', 'u1', '', ?)`,
    ).run(t, t, t);
    db.prepare(
      `INSERT INTO nft_tokens (
        token_id, node_id, minted_from_post_id, minted_by_user_id, novelty_score, connectivity, minted_at,
        current_owner_user_id, acquisition_source, last_purchase_id, is_face_nft, face_cycle_key,
        nrr_genesis_digest, nrr_genesis_at
      ) VALUES ('tok-1', 'n-a', ?, 'u1', 0, 0, ?, 'u1', 'mint', '', 1, 'fk1', 'd', ?),
               ('tok-2', 'n-b', ?, 'u1', 0, 0, ?, 'u1', 'mint', '', 1, 'fk2', 'd', ?)`,
    ).run(postId, t, t, postId, t, t);
    db.prepare(
      `INSERT INTO nft_interconnects (link_id, from_token_id, to_token_id, link_type, meta_json, created_at, route_highlight, vitiated_reason, vitiated_at)
       VALUES ('lnk-1', 'tok-1', 'tok-2', 'comms', '{}', ?, 1, '', '')`,
    ).run(t);
    db.prepare(
      `INSERT INTO tutte_face_cache (epoch, face_key, nodes_json, area, barbour_cx, barbour_cy, barbour_cz, complexity, prime_bucket)
       VALUES (3, 'faceX', ?, 1, 0, 0, 1, 1, 0)`,
    ).run(JSON.stringify(['n-a', 'n-b', 'n-c']));
  });

  it('dims interconnects when collapsed face touches an endpoint node', () => {
    const { vitiatedLinks } = vitiateJointRoutesForCollapsedFaces(db, 3, [{ face_key: 'faceX' }]);
    expect(vitiatedLinks).toBe(1);
    const r = db.prepare(`SELECT route_highlight, vitiated_reason FROM nft_interconnects WHERE link_id = 'lnk-1'`).get();
    expect(r.route_highlight).toBe(0);
    expect(r.vitiated_reason).toBe('face_collapse');
  });
});
