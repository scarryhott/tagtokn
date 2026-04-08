import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, initDb } from './db.js';
import {
  vitiateJointRoutesForCollapsedFaces,
  recordPerspectivalTaxVector,
  computeUserGuideVectors,
} from './guides-collapse.js';
import { nowIso } from './ids.js';

describe('collapse vitiates joint routes', () => {
  let db;

  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    db = openDb({ filename: `:memory:${suffix}` });
    initDb(db);
    const t = nowIso();
    const postId = `p-${suffix}`;
    db.prepare(
      `INSERT INTO social_posts (post_id, platform, author_handle, url, content_text, posted_at, verified, verified_at)
       VALUES (?, 'x', 'h', '', '', ?, 1, ?)`,
    ).run(postId, t, t);
    const na = `n-a-${suffix}`;
    const nb = `n-b-${suffix}`;
    const nc = `n-c-${suffix}`;
    const tok1 = `tok-1-${suffix}`;
    const tok2 = `tok-2-${suffix}`;
    const lnk1 = `lnk-1-${suffix}`;
    const faceKey = `faceX-${suffix}`;
    db._testIds = { na, nb, nc, tok1, tok2, lnk1, faceKey };

    db.prepare(
      `INSERT INTO graph_nodes (node_id, node_type, title, body, owner_user_id, source_ref, created_at)
       VALUES (?, 'user', '', '', 'u1', '', ?), (?, 'user', '', '', 'u1', '', ?), (?, 'user', '', '', 'u1', '', ?)`,
    ).run(na, t, nb, t, nc, t);
    db.prepare(
      `INSERT INTO nft_tokens (
        token_id, node_id, minted_from_post_id, minted_by_user_id, novelty_score, connectivity, minted_at,
        current_owner_user_id, acquisition_source, last_purchase_id, is_face_nft, face_cycle_key,
        nrr_genesis_digest, nrr_genesis_at
      ) VALUES (?, ?, ?, 'u1', 0, 0, ?, 'u1', 'mint', '', 1, 'fk1', 'd', ?),
               (?, ?, ?, 'u1', 0, 0, ?, 'u1', 'mint', '', 1, 'fk2', 'd', ?)`,
    ).run(tok1, na, postId, t, t, tok2, nb, postId, t, t);
    db.prepare(
      `INSERT INTO nft_interconnects (link_id, from_token_id, to_token_id, link_type, meta_json, created_at, route_highlight, vitiated_reason, vitiated_at)
       VALUES (?, ?, ?, 'comms', '{}', ?, 1, '', '')`,
    ).run(lnk1, tok1, tok2, t);
    db.prepare(
      `INSERT INTO tutte_face_cache (epoch, face_key, nodes_json, area, barbour_cx, barbour_cy, barbour_cz, complexity, prime_bucket)
       VALUES (3, ?, ?, 1, 0, 0, 1, 1, 0)`,
    ).run(faceKey, JSON.stringify([na, nb, nc]));
  });

  it('dims interconnects when collapsed face touches an endpoint node', () => {
    const { lnk1, faceKey } = db._testIds;
    const { vitiatedLinks } = vitiateJointRoutesForCollapsedFaces(db, 3, [{ face_key: faceKey }]);
    expect(vitiatedLinks).toBe(1);
    const r = db.prepare(`SELECT route_highlight, vitiated_reason FROM nft_interconnects WHERE link_id = ?`).get(lnk1);
    expect(r.route_highlight).toBe(0);
    expect(r.vitiated_reason).toBe('face_collapse');
  });
});

describe('perspectival tax vectors', () => {
  it('deflects other users primary guide away from mutator collapse chord direction', () => {
    const sx = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const db = openDb({ filename: `:memory:p-${sx}` });
    initDb(db);
    const t = nowIso();
    db.prepare(`INSERT INTO users (user_id, username, password_hash, created_at) VALUES ('u1','a','x',?), ('u2','b','x',?)`).run(
      t,
      t,
    );
    db.prepare(
      `INSERT INTO graph_nodes (node_id, node_type, title, body, owner_user_id, source_ref, created_at)
       VALUES 
       ('m0-${sx}','user','','','u1','',?),
       ('m1-${sx}','user','','','u1','',?),
       ('o0-${sx}','user','','','u2','',?),
       ('o1-${sx}','user','','','u2','',?)`,
    ).run(t, t, t, t);
    db.prepare(
      `INSERT INTO node_embeddings (node_id, epoch, x, y, stress, computed_at) VALUES
       ('o0-${sx}', 1, 0, 0, 0.1, ?),
       ('o1-${sx}', 1, 1, 0, 0.1, ?),
       ('m0-${sx}', 1, 5, 0, 0.1, ?),
       ('m1-${sx}', 1, 6, 0, 0.1, ?)`,
    ).run(t, t, t, t);
    db.prepare(
      `INSERT INTO barbour_snapshots (epoch, stress, node_count, face_count, sphere_radius,
       centroid_x, centroid_y, centroid_z, alpha_mean, computed_at)
       VALUES (1, 0.1, 4, 0, 1, 0.1, 0, 0.9, 0, ?)`,
    ).run(t);
    recordPerspectivalTaxVector(db, {
      epoch: 1,
      sourceUserId: 'u1',
      kind: 'collapse_domain',
      ref: {},
      vx: 1,
      vy: 0,
      weight: 0.9,
    });
    const g2 = computeUserGuideVectors(db, 'u2');
    expect(g2.perspectivalRepellorsApplied).toBeGreaterThan(0);
    expect(Math.abs(g2.primaryGuide.x)).toBeLessThan(0.995);
  });
});
