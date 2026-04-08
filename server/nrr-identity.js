/**
 * Temporal NRR network identity: immutable genesis digest + append-only epoch observations
 * and mutation log. Live Tutte face flags remain the operational projection; this ledger
 * is the non-rewritable record — changes to custody attach to mutators, not edits to genesis.
 */

import { createHash } from 'node:crypto';
import { id, nowIso } from './ids.js';

const GENESIS_SCHEMA = 1;

export function computeNrrGenesisDigest({
  tokenId,
  nodeId,
  mintedFromPostId,
  mintedByUserId,
  mintedAt,
  noveltyScore,
  connectivity,
}) {
  const canonical = {
    v: GENESIS_SCHEMA,
    tokenId,
    nodeId,
    mintedFromPostId,
    mintedByUserId,
    mintedAt,
    noveltyScore,
    connectivity,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Call immediately after INSERT into nft_tokens. Genesis fields must never be UPDATEd in application code. */
export function writeNrrGenesisOnMint(db, row) {
  const digest = computeNrrGenesisDigest(row);
  const at = row.mintedAt || nowIso();
  db.prepare(
    `
    UPDATE nft_tokens
    SET nrr_genesis_digest = ?, nrr_genesis_at = ?
    WHERE token_id = ? AND (TRIM(COALESCE(nrr_genesis_digest,'')) = '')
  `,
  ).run(digest, at, row.tokenId);
}

export function recordGenesisMutation(db, { tokenId, minterUserId, payload }) {
  db.prepare(
    `
    INSERT INTO identity_mutations (
      mutation_id, token_id, mutation_kind, actor_user_id, counterparty_user_id, payload_json, created_at
    ) VALUES (?, ?, 'genesis', ?, '', ?, ?)
  `,
  ).run(id('mut'), tokenId, minterUserId, JSON.stringify(payload ?? {}), nowIso());
}

export function recordCustodyTransferMutation(db, { tokenId, buyerUserId, sellerUserId, payload }) {
  db.prepare(
    `
    INSERT INTO identity_mutations (
      mutation_id, token_id, mutation_kind, actor_user_id, counterparty_user_id, payload_json, created_at
    ) VALUES (?, ?, 'custody_transfer', ?, ?, ?, ?)
  `,
  ).run(
    id('mut'),
    tokenId,
    buyerUserId,
    sellerUserId,
    JSON.stringify(payload ?? {}),
    nowIso(),
  );
}

/**
 * Append one observation per token for this Tutte epoch (spring/shape snapshot).
 * INSERT OR IGNORE: same epoch never written twice.
 */
export function appendNrrEpochObservations(db, epoch) {
  if (!epoch) return { inserted: 0 };
  const snap = db
    .prepare(`SELECT stress, alpha_mean FROM barbour_snapshots WHERE epoch = ?`)
    .get(epoch);
  const graphStress = Number(snap?.stress ?? 0);
  const alphaMean = Number(snap?.alpha_mean ?? 0);
  const observedAt = nowIso();
  const tokens = db.prepare(`SELECT token_id, is_face_nft, face_cycle_key FROM nft_tokens`).all();
  const ins = db.prepare(
    `
    INSERT OR IGNORE INTO nrr_epoch_observations (
      observation_id, token_id, epoch, is_face_admissible, face_cycle_key, graph_stress, barbour_alpha_mean, observed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );
  let inserted = 0;
  for (const t of tokens) {
    const r = ins.run(
      id('nrr_obs'),
      t.token_id,
      epoch,
      t.is_face_nft ? 1 : 0,
      t.face_cycle_key || '',
      graphStress,
      alphaMean,
      observedAt,
    );
    if (r.changes) inserted += 1;
  }
  return { inserted };
}

export function getNrrLedger(db, tokenId) {
  const tok = db
    .prepare(
      `
    SELECT token_id, node_id, minted_from_post_id, minted_by_user_id, minted_at,
           nrr_genesis_digest, nrr_genesis_at, novelty_score, connectivity,
           is_face_nft, face_cycle_key,
           TRIM(COALESCE(current_owner_user_id,'')) AS current_owner
    FROM nft_tokens WHERE token_id = ?
  `,
    )
    .get(tokenId);
  if (!tok) return null;

  const observations = db
    .prepare(
      `
    SELECT observation_id, epoch, is_face_admissible, face_cycle_key, graph_stress, barbour_alpha_mean, observed_at
    FROM nrr_epoch_observations WHERE token_id = ? ORDER BY epoch ASC
  `,
    )
    .all(tokenId);

  const mutations = db
    .prepare(
      `
    SELECT mutation_id, mutation_kind, actor_user_id, counterparty_user_id, payload_json, created_at
    FROM identity_mutations WHERE token_id = ? ORDER BY created_at ASC
  `,
    )
    .all(tokenId);

  return {
    identity: {
      tokenId: tok.token_id,
      nodeId: tok.node_id,
      mintedFromPostId: tok.minted_from_post_id,
      mintedByUserId: tok.minted_by_user_id,
      currentOwnerUserId: tok.current_owner || tok.minted_by_user_id,
      mintedAt: tok.minted_at,
      nrrGenesisDigest: tok.nrr_genesis_digest || '',
      nrrGenesisAt: tok.nrr_genesis_at || '',
      noveltyScore: tok.novelty_score,
      connectivity: tok.connectivity,
      liveFaceAdmissible: !!tok.is_face_nft,
      liveFaceCycleKey: tok.face_cycle_key || '',
    },
    observations,
    mutations,
  };
}
