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

  return {
    epoch,
    userCentroid: userCom,
    globalMass,
    barbourHint2d: { x: barbourHint2d.x, y: barbourHint2d.y },
    primaryGuide,
    secondaryGuide,
    neighbors: neighbors.slice(0, 48),
  };
}

function primeBucketLabel(b) {
  if (b < 0) return 'wheel_-1';
  if (b > 0) return 'wheel_+1';
  return 'wheel_0';
}

const COLLAPSE_WEIGHT = 0.08;
const ALIGN_BONUS = 0.12;

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
  const alphaDelta = ALIGN_BONUS * alignment - COLLAPSE_WEIGHT * collapseWeight;

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
  db.prepare(
    `
    INSERT INTO graph_edges (edge_id, from_node_id, to_node_id, edge_type, weight, created_at)
    VALUES (?, ?, ?, ?, 1.0, ?)
  `,
  ).run(edgeId, fromNodeId, toNodeId, edgeType, nowIso());

  const epoch = preview.epoch;
  const alphaDelta = preview.projectedAlphaDelta;
  const eventId = id('rcol');

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

  return {
    ok: true,
    edgeId,
    eventId,
    collapsedFaces: preview.collapsedFaces,
    guideAlignment: preview.guideAlignment,
    collapseWeight: preview.collapseWeight,
    alphaDelta,
  };
}
