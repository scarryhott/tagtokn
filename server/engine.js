import { nowIso } from './ids.js';

function clamp01(t) {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function l2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function circleLayout(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    out.push({ x: Math.cos(theta), y: Math.sin(theta) });
  }
  return out;
}

/** Stereographic lift R^2 → S^2 (unit sphere), Barbour “shape sphere” coordinatization. */
export function planeToSphere(x, y) {
  const r2 = x * x + y * y;
  const d = 1 + r2;
  return { cx: (2 * x) / d, cy: (2 * y) / d, cz: (r2 - 1) / d };
}

function hslToRgbStr(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `rgb(${r},${g},${b})`;
}

/**
 * Map a face's Barbour complexity (centroid on S^2, area in plane, cycle length) to fill + stroke.
 */
export function barbourFaceColors(face, positions) {
  const pts = face.cycle.map((id) => positions.get(id)).filter(Boolean);
  if (pts.length === 0) {
    return { fill: 'rgba(125, 211, 252, 0.15)', stroke: '#7dd3fc' };
  }
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const p of pts) {
    const s = planeToSphere(p.x, p.y);
    sx += s.cx;
    sy += s.cy;
    sz += s.cz;
  }
  const n = pts.length;
  let cx = sx / n;
  let cy = sy / n;
  let cz = sz / n;
  const norm = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
  cx /= norm;
  cy /= norm;
  cz /= norm;
  const theta = Math.atan2(cy, cx);
  const phi = Math.acos(Math.max(-1, Math.min(1, cz)));
  const hue = ((theta + Math.PI) / (2 * Math.PI));
  const sat = 0.35 + 0.55 * (phi / Math.PI);
  const light = 0.38 + 0.22 * Math.abs(cz);
  const areaW = Math.log1p(face.area || 0);
  const lenW = face.cycle.length / 8;
  const fillAlpha = 0.08 + 0.22 * clamp01((areaW / 3) * (0.5 + lenW));
  const fillRgb = hslToRgbStr(hue, sat, light);
  const m = fillRgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
  const fill = m
    ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${fillAlpha.toFixed(3)})`
    : `rgba(125, 211, 252, ${fillAlpha})`;
  const strokeRgb = hslToRgbStr((hue + 0.08) % 1, Math.min(1, sat + 0.15), Math.min(0.85, light + 0.2));
  return { fill, stroke: strokeRgb, barbour: { cx, cy, cz, theta, phi } };
}

function barbourGlobalSnapshot(positions) {
  const pts = [];
  for (const [, p] of positions) pts.push(planeToSphere(p.x, p.y));
  if (pts.length === 0) return { cx: 0, cy: 0, cz: 1, R: 0 };
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const p of pts) {
    sx += p.cx;
    sy += p.cy;
    sz += p.cz;
  }
  const n = pts.length;
  sx /= n;
  sy /= n;
  sz /= n;
  const L = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1e-9;
  const cx = sx / L;
  const cy = sy / L;
  const cz = sz / L;
  let acc = 0;
  for (const p of pts) {
    const dx = p.cx - cx;
    const dy = p.cy - cy;
    const dz = p.cz - cz;
    acc += dx * dx + dy * dy + dz * dz;
  }
  const R = Math.sqrt(acc / n);
  return { cx, cy, cz, R };
}

export function loadGraph(db, { seedNodeId = null, radius = 2 } = {}) {
  // If seed provided, we do a small BFS over undirected edges; else use whole graph (capped).
  const nodes = new Map();
  const adj = new Map(); // node_id -> Set(node_id)

  const allEdges = db.prepare(`
    SELECT from_node_id, to_node_id, weight
    FROM graph_edges
  `).all();

  function addNode(id) {
    if (!adj.has(id)) adj.set(id, new Set());
  }

  for (const e of allEdges) {
    addNode(e.from_node_id);
    addNode(e.to_node_id);
    adj.get(e.from_node_id).add(e.to_node_id);
    adj.get(e.to_node_id).add(e.from_node_id);
  }

  let active = new Set(adj.keys());
  if (seedNodeId) {
    const seen = new Set([seedNodeId]);
    let frontier = new Set([seedNodeId]);
    for (let d = 0; d < radius; d++) {
      const next = new Set();
      for (const v of frontier) {
        const ns = adj.get(v);
        if (!ns) continue;
        for (const u of ns) {
          if (!seen.has(u)) {
            seen.add(u);
            next.add(u);
          }
        }
      }
      frontier = next;
    }
    active = seen;
  }

  // Load node types/owners for scoring.
  const rows = db.prepare(`
    SELECT node_id, node_type, owner_user_id
    FROM graph_nodes
    WHERE node_id IN (${Array.from(active).map(() => '?').join(',') || "''"})
  `).all(...Array.from(active));

  for (const r of rows) {
    nodes.set(r.node_id, { node_id: r.node_id, node_type: r.node_type, owner_user_id: r.owner_user_id });
  }

  // Restrict adj to active
  const activeAdj = new Map();
  for (const v of active) {
    const ns = adj.get(v) || new Set();
    const filtered = new Set();
    for (const u of ns) if (active.has(u)) filtered.add(u);
    activeAdj.set(v, filtered);
  }

  return { nodes, adj: activeAdj };
}

/**
 * Tutte / spring relaxation in memory only (no DB writes).
 */
export function runTutteRelaxation(db, { seedNodeId = null, radius = 2, maxIters = 300, omega = 0.9 } = {}) {
  const { nodes, adj } = loadGraph(db, { seedNodeId, radius });
  const ids = Array.from(nodes.keys());
  if (ids.length === 0) {
    return { positions: new Map(), stress: 0, faces: [], ids: [], adj, boundary: new Set() };
  }

  const degrees = ids.map((id) => ({ id, deg: (adj.get(id)?.size ?? 0) }));
  degrees.sort((a, b) => b.deg - a.deg);
  const boundaryCount = Math.min(6, Math.max(3, Math.floor(Math.sqrt(ids.length))));
  const boundary = new Set(degrees.slice(0, boundaryCount).map((d) => d.id));

  const boundaryPos = circleLayout(boundary.size);
  const positions = new Map();
  let bi = 0;
  for (const id of boundary) {
    positions.set(id, { x: boundaryPos[bi].x, y: boundaryPos[bi].y });
    bi++;
  }
  for (const id of ids) {
    if (positions.has(id)) continue;
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const a = (h % 1000) / 1000;
    const b = ((h / 1000) % 1000) / 1000;
    positions.set(id, { x: (a - 0.5) * 0.5, y: (b - 0.5) * 0.5 });
  }

  for (let it = 0; it < maxIters; it++) {
    let maxDelta = 0;
    for (const v of ids) {
      if (boundary.has(v)) continue;
      const ns = adj.get(v);
      if (!ns || ns.size === 0) continue;
      let sx = 0;
      let sy = 0;
      for (const u of ns) {
        const pu = positions.get(u);
        sx += pu.x;
        sy += pu.y;
      }
      const tx = sx / ns.size;
      const ty = sy / ns.size;
      const pv = positions.get(v);
      const nx = pv.x + omega * (tx - pv.x);
      const ny = pv.y + omega * (ty - pv.y);
      const dx = nx - pv.x;
      const dy = ny - pv.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > maxDelta) maxDelta = d;
      positions.set(v, { x: nx, y: ny });
    }
    if (maxDelta < 1e-4) break;
  }

  let stressSum = 0;
  let stressCount = 0;
  for (const v of ids) {
    const ns = adj.get(v);
    if (!ns || ns.size === 0) continue;
    let sx = 0;
    let sy = 0;
    for (const u of ns) {
      const pu = positions.get(u);
      sx += pu.x;
      sy += pu.y;
    }
    const tx = sx / ns.size;
    const ty = sy / ns.size;
    const pv = positions.get(v);
    const d = Math.sqrt((pv.x - tx) ** 2 + (pv.y - ty) ** 2);
    stressSum += d;
    stressCount++;
  }
  const stress = stressCount ? stressSum / stressCount : 0;
  const faces = extractSmallFaces({ ids, adj, positions, maxCycleLen: 8, limit: 24 });

  return { positions, stress, faces, ids, adj, boundary };
}

export function refreshFaceNftFlags(db, faces) {
  db.prepare(`UPDATE nft_tokens SET is_face_nft = 0, face_cycle_key = ''`).run();
  const nfts = db.prepare(`SELECT token_id, node_id FROM nft_tokens`).all();
  const nodeToToken = new Map(nfts.map((r) => [r.node_id, r.token_id]));
  const upd = db.prepare(`
    UPDATE nft_tokens SET is_face_nft = 1, face_cycle_key = ? WHERE token_id = ?
  `);
  for (const f of faces) {
    const nftNodes = f.cycle.filter((id) => nodeToToken.has(id));
    if (nftNodes.length !== 1) continue;
    const tokenId = nodeToToken.get(nftNodes[0]);
    const key = cycleKey(f.cycle);
    upd.run(key, tokenId);
  }
}

export function persistGlobalTutte(db, relaxation) {
  const { positions, stress, faces } = relaxation;
  const epochRow = db.prepare(`SELECT COALESCE(MAX(epoch), 0) AS e FROM node_embeddings`).get();
  const epoch = (epochRow?.e ?? 0) + 1;
  const computedAt = nowIso();
  const ins = db.prepare(`
    INSERT OR REPLACE INTO node_embeddings (node_id, epoch, x, y, stress, computed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const txw = db.transaction(() => {
    for (const [nodeId, p] of positions.entries()) {
      ins.run(nodeId, epoch, p.x, p.y, stress, computedAt);
    }
    const snap = barbourGlobalSnapshot(positions);
    const alphaRow = db.prepare(`SELECT AVG(alpha) AS a FROM user_reputation`).get();
    const alphaMean = Number(alphaRow?.a ?? 0);
    db.prepare(`
      INSERT OR REPLACE INTO barbour_snapshots (
        epoch, stress, node_count, face_count, sphere_radius,
        centroid_x, centroid_y, centroid_z, alpha_mean, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      epoch,
      stress,
      positions.size,
      faces.length,
      snap.R,
      snap.cx,
      snap.cy,
      snap.cz,
      alphaMean,
      computedAt
    );
    refreshFaceNftFlags(db, faces);
    cacheGlobalFaces(db, epoch, faces, positions);
  });
  txw();
  return { epoch, positions, stress, faces, barbour: barbourGlobalSnapshot(positions), persisted: true };
}

function cacheGlobalFaces(db, epoch, faces, positions) {
  db.prepare(`DELETE FROM tutte_face_cache WHERE epoch = ?`).run(epoch);
  const ins = db.prepare(`
    INSERT INTO tutte_face_cache (
      epoch, face_key, nodes_json, area, barbour_cx, barbour_cy, barbour_cz, complexity, prime_bucket
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const f of faces) {
    const key = cycleKey(f.cycle);
    const colored = barbourFaceColors(f, positions);
    const { cx, cy, cz, theta } = colored.barbour;
    const u = (theta + Math.PI) / (2 * Math.PI);
    let primeBucket = 0;
    if (u < 1 / 3) primeBucket = -1;
    else if (u < 2 / 3) primeBucket = 0;
    else primeBucket = 1;
    const complexity = (1 + (f.area || 0)) * (1 + Math.abs(cz)) * (0.5 + f.cycle.length / 6);
    ins.run(epoch, key, JSON.stringify(f.cycle), f.area || 0, cx, cy, cz, complexity, primeBucket);
  }
}

/**
 * Global Tutte when seedNodeId is null/falsy: persist epoch + Barbour snapshot + face NFT flags.
 * Local preview when seedNodeId set: in-memory only (does not bump epoch).
 */
export function computeTutteEmbedding(db, { seedNodeId = null, radius = 2, maxIters = 300, omega = 0.9 } = {}) {
  const relaxation = runTutteRelaxation(db, { seedNodeId, radius, maxIters, omega });
  if (relaxation.ids.length === 0) {
    const latest = db.prepare(`SELECT COALESCE(MAX(epoch), 0) AS e FROM node_embeddings`).get();
    return { epoch: latest?.e ?? 0, positions: new Map(), stress: 0, faces: [], persisted: false };
  }
  if (!seedNodeId) {
    return persistGlobalTutte(db, relaxation);
  }
  const latest = db.prepare(`SELECT COALESCE(MAX(epoch), 0) AS e FROM node_embeddings`).get();
  return {
    epoch: latest?.e ?? 0,
    persisted: false,
    ...relaxation,
  };
}

export function canonicalCycleKey(cycle) {
  return cycleKey(cycle);
}

function cycleKey(cycle) {
  // normalize by rotation + direction
  const n = cycle.length;
  const a = cycle.slice();
  const b = cycle.slice().reverse();
  function minRot(arr) {
    let best = null;
    for (let i = 0; i < n; i++) {
      const rot = arr.slice(i).concat(arr.slice(0, i));
      const k = rot.join('|');
      if (best === null || k < best) best = k;
    }
    return best;
  }
  return minRot(a) < minRot(b) ? minRot(a) : minRot(b);
}

function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function extractSmallFaces({ ids, adj, positions, maxCycleLen = 8, limit = 24 }) {
  const seen = new Set();
  const out = [];

  // DFS cycles; bounded to keep runtime OK for production.
  const idIndex = new Map(ids.map((id, i) => [id, i]));

  function dfs(start, current, path, visited) {
    if (path.length > maxCycleLen) return;
    const ns = adj.get(current);
    if (!ns) return;
    for (const nxt of ns) {
      if (nxt === start && path.length >= 3) {
        const cycle = path.slice();
        const key = cycleKey(cycle);
        if (!seen.has(key)) {
          seen.add(key);
          const pts = cycle.map((id) => positions.get(id));
          const area = Math.abs(polygonArea(pts));
          out.push({ cycle, area });
        }
        continue;
      }
      if (visited.has(nxt)) continue;
      // Symmetry pruning: only explore nodes with index >= start to reduce duplicates
      if ((idIndex.get(nxt) ?? 0) < (idIndex.get(start) ?? 0)) continue;
      visited.add(nxt);
      path.push(nxt);
      dfs(start, nxt, path, visited);
      path.pop();
      visited.delete(nxt);
      if (out.length > limit * 10) return;
    }
  }

  for (const start of ids) {
    const visited = new Set([start]);
    dfs(start, start, [start], visited);
    if (out.length > limit * 10) break;
  }

  out.sort((a, b) => b.area - a.area);
  return out.slice(0, limit);
}

export function updateUserReputationFromEpoch(db, { epoch, positions, seedNodeId = null } = {}) {
  // Barbour-style alpha (operational): blend of (connectivity centrality + curvature/inertia)
  // - connectivity proxy: log(1 + degree) averaged over user's nodes
  // - curvature proxy: how much the user's nodes moved since last epoch (inertia rotation)
  // This makes alpha a reputation vector tied to graph dynamics.

  const prevEpoch = epoch - 1;
  const prev = new Map();
  if (prevEpoch > 0) {
    const prevRows = db.prepare(`
      SELECT node_id, x, y FROM node_embeddings WHERE epoch = ?
    `).all(prevEpoch);
    for (const r of prevRows) prev.set(r.node_id, { x: r.x, y: r.y });
  }

  // degrees
  const degRows = db.prepare(`
    SELECT from_node_id AS node_id, COUNT(*) AS deg FROM graph_edges GROUP BY from_node_id
    UNION ALL
    SELECT to_node_id AS node_id, COUNT(*) AS deg FROM graph_edges GROUP BY to_node_id
  `).all();
  const degree = new Map();
  for (const r of degRows) degree.set(r.node_id, (degree.get(r.node_id) ?? 0) + r.deg);

  const userNodes = db.prepare(`
    SELECT node_id, owner_user_id FROM graph_nodes WHERE owner_user_id != ''
  `).all();

  const agg = new Map(); // user -> {degSum, moveSum, n}
  for (const r of userNodes) {
    if (seedNodeId && r.node_id !== seedNodeId) {
      // keep simple; when seed specified we still update all users (engine-wide)
    }
    const p = positions.get(r.node_id);
    if (!p) continue;
    const d = degree.get(r.node_id) ?? 0;
    const prevP = prev.get(r.node_id);
    const move = prevP ? l2(p, prevP) : 0;
    if (!agg.has(r.owner_user_id)) agg.set(r.owner_user_id, { degSum: 0, moveSum: 0, n: 0 });
    const a = agg.get(r.owner_user_id);
    a.degSum += Math.log(1 + d);
    a.moveSum += move;
    a.n += 1;
  }

  const upsert = db.prepare(`
    INSERT INTO user_reputation (user_id, alpha, inertia_x, inertia_y, last_epoch, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      alpha=excluded.alpha,
      inertia_x=excluded.inertia_x,
      inertia_y=excluded.inertia_y,
      last_epoch=excluded.last_epoch,
      updated_at=excluded.updated_at
  `);

  const now = nowIso();
  const tx = db.transaction(() => {
    for (const [userId, a] of agg.entries()) {
      const n = a.n || 1;
      const alpha = (a.degSum / n) + 2.0 * (a.moveSum / n);
      // inertia vector: we don’t yet have true “rotation”; store as (mean_move, alpha) split
      upsert.run(userId, alpha, a.moveSum / n, a.degSum / n, epoch, now);
    }
  });
  tx();

  return { updatedUsers: agg.size };
}

export function scoreCandidateConnectivity(db, { candidateNodeId, perspectiveNodeType = 'perspective', radius = 3 } = {}) {
  // Connectivity = distinct perspective nodes reachable within radius.
  const rows = db.prepare(`
    SELECT from_node_id, to_node_id FROM graph_edges
  `).all();
  const adj = new Map();
  function add(v) { if (!adj.has(v)) adj.set(v, new Set()); }
  for (const e of rows) {
    add(e.from_node_id); add(e.to_node_id);
    adj.get(e.from_node_id).add(e.to_node_id);
    adj.get(e.to_node_id).add(e.from_node_id);
  }

  const typeRows = db.prepare(`
    SELECT node_id, node_type FROM graph_nodes
  `).all();
  const type = new Map(typeRows.map((r) => [r.node_id, r.node_type]));

  const seen = new Set([candidateNodeId]);
  let frontier = new Set([candidateNodeId]);
  const perspectives = new Set();

  for (let d = 0; d < radius; d++) {
    const next = new Set();
    for (const v of frontier) {
      const ns = adj.get(v);
      if (!ns) continue;
      for (const u of ns) {
        if (seen.has(u)) continue;
        seen.add(u);
        next.add(u);
        if (type.get(u) === perspectiveNodeType) perspectives.add(u);
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }

  return { connectivity: perspectives.size, perspectiveIds: Array.from(perspectives) };
}

/**
 * Per-epoch centroid of each user's owned nodes in the Tutte plane → perspectival paths (temporal ledger geometry).
 */
export function computePerspectivalPaths(db, { maxUsers = 24 } = {}) {
  const epochRows = db.prepare(`SELECT DISTINCT epoch FROM node_embeddings ORDER BY epoch ASC`).all();
  const epochs = epochRows.map((r) => r.epoch);
  if (epochs.length === 0) return { epochs: [], paths: [] };

  const ownerRows = db
    .prepare(
      `
    SELECT DISTINCT TRIM(owner_user_id) AS uid FROM graph_nodes
    WHERE TRIM(COALESCE(owner_user_id,'')) != ''
  `,
    )
    .all();
  let userIds = ownerRows.map((r) => r.uid).filter(Boolean);

  const nftUserRows = db
    .prepare(
      `
    SELECT DISTINCT minted_by_user_id AS uid FROM nft_tokens WHERE TRIM(COALESCE(minted_by_user_id,'')) != ''
    UNION
    SELECT DISTINCT TRIM(COALESCE(current_owner_user_id,'')) FROM nft_tokens
    WHERE TRIM(COALESCE(current_owner_user_id,'')) != ''
  `,
    )
    .all();
  const priority = new Set(nftUserRows.map((r) => Object.values(r)[0]).filter(Boolean));

  userIds.sort((a, b) => {
    const pa = priority.has(a) ? 1 : 0;
    const pb = priority.has(b) ? 1 : 0;
    if (pb !== pa) return pb - pa;
    return String(a).localeCompare(String(b));
  });
  userIds = userIds.slice(0, maxUsers);

  const nodesByUser = new Map();
  for (const uid of userIds) {
    const nids = db.prepare(`SELECT node_id FROM graph_nodes WHERE owner_user_id = ?`).all(uid).map((r) => r.node_id);
    nodesByUser.set(uid, new Set(nids));
  }

  const posStmt = db.prepare(`SELECT node_id, x, y FROM node_embeddings WHERE epoch = ?`);
  const paths = [];

  for (const userId of userIds) {
    const nodeSet = nodesByUser.get(userId);
    if (!nodeSet || nodeSet.size === 0) continue;
    const points = [];
    for (const epoch of epochs) {
      const rows = posStmt.all(epoch);
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const r of rows) {
        if (!nodeSet.has(r.node_id)) continue;
        sx += r.x;
        sy += r.y;
        n += 1;
      }
      if (n > 0) points.push({ epoch, x: sx / n, y: sy / n });
    }
    if (points.length < 2) continue;
    const tokenRows = db
      .prepare(
        `
      SELECT token_id FROM nft_tokens
      WHERE minted_by_user_id = ? OR TRIM(COALESCE(current_owner_user_id,'')) = ?
      LIMIT 12
    `,
      )
      .all(userId, userId);
    paths.push({
      userId,
      points,
      tokenIds: tokenRows.map((r) => r.token_id),
    });
  }

  return { epochs, paths };
}

/** Single NFT node's coordinates across epochs (temporal Tutte trail). */
export function computeNftTemporalTrail(db, tokenId) {
  const tok = db.prepare(`SELECT token_id, node_id FROM nft_tokens WHERE token_id = ?`).get(tokenId);
  if (!tok) return null;
  const rows = db
    .prepare(
      `
    SELECT epoch, x, y, stress FROM node_embeddings WHERE node_id = ? ORDER BY epoch ASC
  `,
    )
    .all(tok.node_id);
  return {
    tokenId: tok.token_id,
    nodeId: tok.node_id,
    points: rows.map((r) => ({
      epoch: r.epoch,
      x: r.x,
      y: r.y,
      stress: r.stress,
    })),
  };
}

