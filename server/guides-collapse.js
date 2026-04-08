/**
 * User guide vectors on the global Tutte embedding + reputation impact when
 * new edges collapse Tutte faces (Barbour complexity + prime-wheel buckets).
 */

import { nowIso, id } from './ids.js';

export function getLatestGraphEpoch(db) {
  const row = db.prepare(`SELECT MAX(epoch) AS e FROM node_embeddings`).get();
  return row?.e ?? 0;
}

export function loadPositionsForEpoch(db, epoch) {
  const rows = db.prepare(`SELECT node_id, x, y FROM node_embeddings WHERE epoch = ?`).all(epoch);
  const m = new Map();
  for (const r of rows) m.set(r.node_id, { x: r.x, y: r.y });
  return m;
}

function meanPoint(ids, posMap) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const id of ids) {
    const p = posMap.get(id);
    if (!p) continue;
    sx += p.x;
    sy += p.y;
    n++;
  }
  if (!n) return { x: 0, y: 0 };
  return { x: sx / n, y: sy / n };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function norm2(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y) || 1e-9;
}

function normalize2(v) {
  const n = norm2(v);
  return { x: v.x / n, y: v.y / n };
}

function perp(v) {
  return { x: -v.y, y: v.x };
}

/**
 * Global perspectival tax field: chord direction in Tutte / token space. Other users' guides are
 * deflected away from alignment with this domain (they do not "look along" the mutator's collapse lane).
 */
export function recordPerspectivalTaxVector(db, { epoch, sourceUserId, kind, ref, vx, vy, weight }) {
  const n = norm2({ x: vx, y: vy });
  if (n < 1e-10) return;
  const u = normalize2({ x: vx, y: vy });
  const w = Math.min(2.5, Math.max(0.05, weight));
  db.prepare(
    `
    INSERT INTO perspectival_tax_vectors (
      vector_id, epoch, source_user_id, kind, ref_json, vx, vy, weight, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(id('ptax'), epoch, sourceUserId, kind, JSON.stringify(ref ?? {}), u.x, u.y, w, nowIso());
}

export function recordInadmissibleTaxPerspectivalDomain(db, { payerUserId, fromTokenId, toTokenId, taxAlpha }) {
  const epoch = getLatestGraphEpoch(db);
  if (!epoch) return { ok: false, error: 'no_epoch' };
  const na = db.prepare(`SELECT node_id FROM nft_tokens WHERE token_id = ?`).get(fromTokenId);
  const nb = db.prepare(`SELECT node_id FROM nft_tokens WHERE token_id = ?`).get(toTokenId);
  if (!na?.node_id || !nb?.node_id) return { ok: false, error: 'token_nodes' };
  const pos = loadPositionsForEpoch(db, epoch);
  const pf = pos.get(na.node_id);
  const pt = pos.get(nb.node_id);
  if (!pf || !pt) return { ok: false, error: 'no_positions' };
  const connU = normalize2(sub(pt, pf));
  const weight = Math.max(0.12, taxAlpha * 1.15);
  recordPerspectivalTaxVector(db, {
    epoch,
    sourceUserId: payerUserId,
    kind: 'inadmissible_interconnect',
    ref: { fromTokenId, toTokenId },
    vx: connU.x,
    vy: connU.y,
    weight,
  });
  return { ok: true };
}

function applyPerspectivalDeflectionToGuides(db, viewerUserId, epoch, primaryGuide, secondaryGuide) {
  const rows = db
    .prepare(
      `
    SELECT source_user_id, vx, vy, weight, epoch AS created_epoch
    FROM perspectival_tax_vectors
    ORDER BY created_at DESC
    LIMIT 120
  `,
    )
    .all();
  let pg = { x: primaryGuide.x, y: primaryGuide.y };
  let applied = 0;
  for (const r of rows) {
    if (r.source_user_id === viewerUserId) continue;
    const age = Math.max(0, epoch - (r.created_epoch ?? epoch));
    const decay = Math.exp(-0.045 * age);
    const w = r.weight * decay * 0.52;
    if (w < 0.012) continue;
    const dot = pg.x * r.vx + pg.y * r.vy;
    if (dot > 0) {
      pg = normalize2({
        x: pg.x - w * dot * r.vx,
        y: pg.y - w * dot * r.vy,
      });
      applied += 1;
    }
  }
  const sg = normalize2(perp(pg));
  return { primaryGuide: pg, secondaryGuide: sg, perspectivalRepellorsApplied: applied };
}

/**
 * Prime-wheel style triangulation bucket on S^1 for generator-node labeling: {-1, 0, +1}.
 */
export function primeWheelBucketFromAngle(theta) {
  const u = (theta + Math.PI) / (2 * Math.PI);
  if (u < 1 / 3) return -1;
  if (u < 2 / 3) return 0;
  return 1;
}

/**
 * Faces that are "collapsed" combinatorially when adding chord (from,to):
 * minimal cycles that already contain both endpoints (new edge shortcuts the face).
 */
export function facesCollapsedByChord(cachedFaces, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return [];
  return cachedFaces.filter((f) => {
    let hasA = false;
    let hasB = false;
    for (const n of f.nodes) {
      if (n === fromId) hasA = true;
      if (n === toId) hasB = true;
    }
    return hasA && hasB;
  });
}

function loadCachedFaces(db, epoch) {
  if (!epoch) return [];
  return db
    .prepare(
      `
    SELECT face_key, nodes_json, area, barbour_cx, barbour_cy, barbour_cz, complexity, prime_bucket
    FROM tutte_face_cache WHERE epoch = ?
  `,
    )
    .all(epoch)
    .map((r) => ({
      face_key: r.face_key,
      nodes: JSON.parse(r.nodes_json),
      area: r.area,
      barbour: { cx: r.barbour_cx, cy: r.barbour_cy, cz: r.barbour_cz },
      complexity: r.complexity,
      prime_bucket: r.prime_bucket,
    }));
}

/**
 * Guide vectors for a user: toward global Barbour shape, toward graph mass, exploration normal,
 * plus neighbor suggestions with prime buckets.
 */
export function computeUserGuideVectors(db, userId) {
  const epoch = getLatestGraphEpoch(db);
  if (!epoch) {
    return {
      epoch: 0,
      primaryGuide: { x: 1, y: 0 },
      secondaryGuide: { x: 0, y: 1 },
      barbourHint2d: { x: 0, y: 0 },
      userCentroid: { x: 0, y: 0 },
      globalMass: { x: 0, y: 0 },
      neighbors: [],
      perspectivalRepellorsApplied: 0,
    };
  }

  const pos = loadPositionsForEpoch(db, epoch);
  const allIds = [...pos.keys()];
  const userRows = db
    .prepare(`SELECT node_id FROM graph_nodes WHERE owner_user_id = ?`)
    .all(userId);
  const userNodeIds = userRows.map((r) => r.node_id).filter((nid) => pos.has(nid));
  const userCom = meanPoint(userNodeIds, pos);
  const globalMass = meanPoint(allIds, pos);

  const b = db.prepare(`SELECT centroid_x, centroid_y, centroid_z FROM barbour_snapshots WHERE epoch = ?`).get(epoch);
  const barbourHint2d = b
    ? normalize2({ x: b.centroid_x + b.centroid_y * 0.25, y: b.centroid_z + b.centroid_y * 0.25 })
    : normalize2(sub(globalMass, userCom));

  const towardMass = normalize2(sub(globalMass, userCom));
  const primaryGuide = normalize2({
    x: towardMass.x + barbourHint2d.x,
    y: towardMass.y + barbourHint2d.y,
  });
  const secondaryGuide = normalize2(perp(primaryGuide));

  const neighbors = [];
  const seen = new Set(userNodeIds);
  const edgeRows = db.prepare(`SELECT from_node_id, to_node_id FROM graph_edges`).all();
  const adj = new Map();
  function add(a, b) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  for (const e of edgeRows) {
    add(e.from_node_id, e.to_node_id);
    add(e.to_node_id, e.from_node_id);
  }
  for (const uid of userNodeIds) {
    for (const v of adj.get(uid) || []) {
      if (seen.has(v)) continue;
      const pu = pos.get(uid);
      const pv = pos.get(v);
      if (!pu || !pv) continue;
      const dir = normalize2(sub(pv, pu));
      const theta = Math.atan2(dir.y, dir.x);
      neighbors.push({
        neighbor_node_id: v,
        anchor_node_id: uid,
        direction: dir,
        prime_bucket: primeWheelBucketFromAngle(theta),
        bucket_label: primeBucketLabel(primeWheelBucketFromAngle(theta)),
      });
    }
  }

  const deflected = applyPerspectivalDeflectionToGuides(db, userId, epoch, primaryGuide, secondaryGuide);

  return {
    epoch,
    userCentroid: userCom,
    globalMass,
    barbourHint2d: { x: barbourHint2d.x, y: barbourHint2d.y },
    primaryGuide: deflected.primaryGuide,
    secondaryGuide: deflected.secondaryGuide,
    neighbors: neighbors.slice(0, 48),
    perspectivalRepellorsApplied: deflected.perspectivalRepellorsApplied,
  };
}

function primeBucketLabel(b) {
  if (b < 0) return 'wheel_-1';
  if (b > 0) return 'wheel_+1';
  return 'wheel_0';
}

const COLLAPSE_WEIGHT = 0.08;
const ALIGN_BONUS = 0.12;
/** Extra α destruction per collapsed face — admission to prior joint geometry is taxed. */
const COLLAPSE_ADMISSION_SURCHARGE_PER_FACE = 0.035;

/** Paid when creating interconnect without current face admissibility on either endpoint. */
export const NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA = 0.18;

/**
 * Face collapse vitiates highlighted joint routes (interconnects) touching collapsed faces —
 * they remain in history but are no longer promoted as admissible channels.
 */
export function vitiateJointRoutesForCollapsedFaces(db, epoch, collapsedFaceObjs) {
  if (!epoch || !collapsedFaceObjs?.length) return { vitiatedLinks: 0 };
  const nodeHit = new Set();
  const stmt = db.prepare(`SELECT nodes_json FROM tutte_face_cache WHERE epoch = ? AND face_key = ?`);
  for (const f of collapsedFaceObjs) {
    const fk = f.face_key;
    if (!fk) continue;
    const row = stmt.get(epoch, fk);
    if (!row?.nodes_json) continue;
    try {
      for (const n of JSON.parse(row.nodes_json)) nodeHit.add(n);
    } catch (_) {
      /* ignore */
    }
  }
  if (nodeHit.size === 0) return { vitiatedLinks: 0 };

  const tokRows = db.prepare(`SELECT token_id, node_id FROM nft_tokens`).all();
  const tokenHit = new Set();
  for (const t of tokRows) {
    if (nodeHit.has(t.node_id)) tokenHit.add(t.token_id);
  }
  if (tokenHit.size === 0) return { vitiatedLinks: 0 };

  const links = db
    .prepare(`SELECT link_id, from_token_id, to_token_id FROM nft_interconnects WHERE COALESCE(route_highlight, 1) = 1`)
    .all();
  const ts = nowIso();
  const upd = db.prepare(`
    UPDATE nft_interconnects
    SET route_highlight = 0, vitiated_reason = 'face_collapse', vitiated_at = ?
    WHERE link_id = ?
  `);
  let vitiatedLinks = 0;
  for (const l of links) {
    if (tokenHit.has(l.from_token_id) || tokenHit.has(l.to_token_id)) {
      upd.run(ts, l.link_id);
      vitiatedLinks += 1;
    }
  }
  return { vitiatedLinks };
}

export function applyInadmissibleInterconnectTax(db, userId, taxAlpha = NON_ADMISSIBLE_INTERCONNECT_TAX_ALPHA) {
  const epoch = getLatestGraphEpoch(db);
  const prev = db.prepare(`SELECT alpha FROM user_reputation WHERE user_id = ?`).get(userId);
  const nextAlpha = (prev?.alpha ?? 0) - taxAlpha;
  db.prepare(
    `
    INSERT INTO user_reputation (user_id, alpha, inertia_x, inertia_y, last_epoch, updated_at)
    VALUES (?, ?, 0, 0, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      alpha = excluded.alpha,
      last_epoch = excluded.last_epoch,
      updated_at = excluded.updated_at
  `,
  ).run(userId, nextAlpha, epoch, nowIso());
  return { taxAlpha, alphaAfter: nextAlpha };
}

export function previewConnectionImpact(db, { userId, fromNodeId, toNodeId }) {
  const epoch = getLatestGraphEpoch(db);
  const owner = db.prepare(`SELECT owner_user_id FROM graph_nodes WHERE node_id = ?`).get(fromNodeId);
  if (!owner || owner.owner_user_id !== userId) {
    return { ok: false, error: 'must_own_from_node', fromNodeId };
  }

  const dup = db
    .prepare(
      `
    SELECT 1 FROM graph_edges
    WHERE (from_node_id = ? AND to_node_id = ?) OR (from_node_id = ? AND to_node_id = ?)
  `,
    )
    .get(fromNodeId, toNodeId, toNodeId, fromNodeId);
  if (dup) {
    return { ok: false, error: 'edge_exists' };
  }

  const pos = loadPositionsForEpoch(db, epoch);
  const pf = pos.get(fromNodeId);
  const pt = pos.get(toNodeId);
  if (!pf || !pt) {
    return { ok: false, error: 'nodes_not_in_last_epoch_recompute' };
  }

  const guides = computeUserGuideVectors(db, userId);
  const conn = sub(pt, pf);
  const connU = normalize2(conn);
  const alignment = connU.x * guides.primaryGuide.x + connU.y * guides.primaryGuide.y;

  const cached = loadCachedFaces(db, epoch);
  const collapsed = facesCollapsedByChord(cached, fromNodeId, toNodeId);
  const collapseWeight = collapsed.reduce((s, f) => s + f.complexity, 0);
  const collapseSurcharge = collapsed.length * COLLAPSE_ADMISSION_SURCHARGE_PER_FACE;
  const alphaDelta = ALIGN_BONUS * alignment - COLLAPSE_WEIGHT * collapseWeight - collapseSurcharge;

  return {
    ok: true,
    epoch,
    collapsedFaces: collapsed.map((f) => ({
      face_key: f.face_key,
      prime_bucket: f.prime_bucket,
      complexity: f.complexity,
      barbour: f.barbour,
    })),
    guideAlignment: alignment,
    collapseWeight,
    collapseSurcharge,
    projectedAlphaDelta: alphaDelta,
    guides: {
      primaryGuide: guides.primaryGuide,
      secondaryGuide: guides.secondaryGuide,
    },
  };
}

export function applyConnectionWithCollapse(db, { userId, fromNodeId, toNodeId, edgeType = 'user_connect' }) {
  const preview = previewConnectionImpact(db, { userId, fromNodeId, toNodeId });
  if (!preview.ok) return { ok: false, error: preview.error };

  const edgeId = id('edge');
  const epoch = preview.epoch;
  const alphaDelta = preview.projectedAlphaDelta;
  const eventId = id('rcol');

  let vitiatedLinks = 0;

  const run = db.transaction(() => {
    db.prepare(
      `
    INSERT INTO graph_edges (edge_id, from_node_id, to_node_id, edge_type, weight, created_at)
    VALUES (?, ?, ?, ?, 1.0, ?)
  `,
    ).run(edgeId, fromNodeId, toNodeId, edgeType, nowIso());

    const prevRep = db.prepare(`SELECT alpha FROM user_reputation WHERE user_id = ?`).get(userId);
    const nextAlpha = (prevRep?.alpha ?? 0) + alphaDelta;
    db.prepare(
      `
    INSERT INTO user_reputation (user_id, alpha, inertia_x, inertia_y, last_epoch, updated_at)
    VALUES (?, ?, 0, 0, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      alpha = excluded.alpha,
      last_epoch = excluded.last_epoch,
      updated_at = excluded.updated_at
  `,
    ).run(userId, nextAlpha, epoch, nowIso());

    db.prepare(
      `
    INSERT INTO reputation_collapse_events (
      event_id, user_id, from_node_id, to_node_id, edge_id, epoch,
      collapsed_face_keys_json, collapse_weight, guide_alignment, alpha_delta, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    ).run(
      eventId,
      userId,
      fromNodeId,
      toNodeId,
      edgeId,
      epoch,
      JSON.stringify(preview.collapsedFaces.map((f) => f.face_key)),
      preview.collapseWeight,
      preview.guideAlignment,
      alphaDelta,
      nowIso(),
    );

    const vit = vitiateJointRoutesForCollapsedFaces(db, epoch, preview.collapsedFaces);
    vitiatedLinks = vit.vitiatedLinks;

    if (preview.collapsedFaces.length > 0) {
      const posAfter = loadPositionsForEpoch(db, epoch);
      const pf = posAfter.get(fromNodeId);
      const pt = posAfter.get(toNodeId);
      if (pf && pt) {
        const connU = normalize2(sub(pt, pf));
        const weight = Math.max(
          0.14,
          preview.collapseWeight * 0.22 +
            preview.collapseSurcharge * 2.85 +
            0.055 * preview.collapsedFaces.length,
        );
        recordPerspectivalTaxVector(db, {
          epoch,
          sourceUserId: userId,
          kind: 'collapse_domain',
          ref: {
            fromNodeId,
            toNodeId,
            edgeId,
            faceKeys: preview.collapsedFaces.map((f) => f.face_key),
          },
          vx: connU.x,
          vy: connU.y,
          weight,
        });
      }
    }
  });

  run();

  return {
    ok: true,
    edgeId,
    eventId,
    collapsedFaces: preview.collapsedFaces,
    guideAlignment: preview.guideAlignment,
    collapseWeight: preview.collapseWeight,
    collapseSurcharge: preview.collapseSurcharge,
    alphaDelta,
    vitiatedLinks,
  };
}
