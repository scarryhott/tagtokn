/**
 * Novelty from Tutte global epoch: prime-wheel guide diversity + Barbour / α alignment.
 * Kimi and product copy can treat this scalar as the geometric "novelty" prior.
 */

import { getLatestGraphEpoch, computeUserGuideVectors } from './guides-collapse.js';

function uniquePrimeBuckets(neighbors) {
  const s = new Set();
  for (const n of neighbors || []) {
    if (typeof n.prime_bucket === 'number') s.add(n.prime_bucket);
  }
  return s.size;
}

/**
 * @returns {{ noveltyScore: number, connectivity: number, primeSpread: number, barbourAlphaDelta: number, epoch: number }}
 */
export function computeTutteBarbourNovelty(db, userId) {
  const epoch = getLatestGraphEpoch(db);
  if (!epoch || !userId) {
    return { noveltyScore: 0.15, connectivity: 0, primeSpread: 0, barbourAlphaDelta: 0, epoch: epoch || 0 };
  }

  let guides;
  try {
    guides = computeUserGuideVectors(db, userId);
  } catch {
    return { noveltyScore: 0.12, connectivity: 0, primeSpread: 0, barbourAlphaDelta: 0, epoch };
  }

  const primeSpread = uniquePrimeBuckets(guides.neighbors);
  const connectivity = guides.neighbors?.length ?? 0;

  const rep = db.prepare(`SELECT alpha FROM user_reputation WHERE user_id = ?`).get(userId);
  const snap = db.prepare(`SELECT alpha_mean FROM barbour_snapshots WHERE epoch = ?`).get(epoch);
  const userAlpha = rep?.alpha ?? 0;
  const meanAlpha = snap?.alpha_mean ?? 0;
  const barbourAlphaDelta = Math.min(1, Math.abs(userAlpha - meanAlpha));

  // Prime buckets: {-1,0,1} → max spread 3. Normalize.
  const spread01 = primeSpread / 3;
  const conn01 = 1 - Math.exp(-connectivity / 12);

  // Higher novelty when guides explore distinct wheel sectors and α diverges from population mean (perspective).
  const noveltyScore = Math.min(
    1,
    0.22 + 0.38 * spread01 + 0.28 * conn01 + 0.18 * barbourAlphaDelta,
  );

  return {
    noveltyScore,
    connectivity,
    primeSpread,
    barbourAlphaDelta,
    epoch,
  };
}
