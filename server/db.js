import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { generateBioVerificationCode } from './social-identity.js';

export function openDb({ filename = 'data/nfc.db' } = {}) {
  const dbPath = path.isAbsolute(filename) ? filename : path.join(process.cwd(), filename);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS graph_nodes (
      node_id TEXT PRIMARY KEY,
      node_type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      owner_user_id TEXT NOT NULL DEFAULT '',
      source_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(node_type);
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_owner ON graph_nodes(owner_user_id);

    CREATE TABLE IF NOT EXISTS graph_edges (
      edge_id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(from_node_id) REFERENCES graph_nodes(node_id),
      FOREIGN KEY(to_node_id) REFERENCES graph_nodes(node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges(to_node_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(edge_type);

    CREATE TABLE IF NOT EXISTS social_posts (
      post_id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      url TEXT NOT NULL,
      content_text TEXT NOT NULL DEFAULT '',
      posted_at TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS nft_tokens (
      token_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      minted_from_post_id TEXT NOT NULL,
      minted_by_user_id TEXT NOT NULL,
      novelty_score REAL NOT NULL DEFAULT 0.0,
      connectivity INTEGER NOT NULL DEFAULT 0,
      minted_at TEXT NOT NULL,
      FOREIGN KEY(node_id) REFERENCES graph_nodes(node_id),
      FOREIGN KEY(minted_from_post_id) REFERENCES social_posts(post_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nft_tokens_minter ON nft_tokens(minted_by_user_id);

    CREATE TABLE IF NOT EXISTS nft_contracts (
      contract_id TEXT PRIMARY KEY,
      token_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(token_id) REFERENCES nft_tokens(token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nft_contracts_token ON nft_contracts(token_id);

    CREATE TABLE IF NOT EXISTS nft_listings (
      listing_id TEXT PRIMARY KEY,
      token_id TEXT NOT NULL,
      seller_user_id TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(token_id) REFERENCES nft_tokens(token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nft_listings_status ON nft_listings(status);

    CREATE TABLE IF NOT EXISTS nft_purchases (
      purchase_id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      token_id TEXT NOT NULL,
      buyer_user_id TEXT NOT NULL,
      seller_user_id TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      platform_fee_bps INTEGER NOT NULL,
      platform_fee_cents INTEGER NOT NULL,
      seller_proceeds_cents INTEGER NOT NULL,
      purchased_at TEXT NOT NULL,
      FOREIGN KEY(listing_id) REFERENCES nft_listings(listing_id),
      FOREIGN KEY(token_id) REFERENCES nft_tokens(token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nft_purchases_buyer ON nft_purchases(buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_nft_purchases_seller ON nft_purchases(seller_user_id);

    -- Engine state (continuous embedding + Barbour-style reputation alpha)
    CREATE TABLE IF NOT EXISTS node_embeddings (
      node_id TEXT NOT NULL,
      epoch INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      stress REAL NOT NULL DEFAULT 0.0,
      computed_at TEXT NOT NULL,
      PRIMARY KEY (node_id, epoch),
      FOREIGN KEY(node_id) REFERENCES graph_nodes(node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_node_embeddings_epoch ON node_embeddings(epoch);

    CREATE TABLE IF NOT EXISTS user_reputation (
      user_id TEXT PRIMARY KEY,
      alpha REAL NOT NULL DEFAULT 0.0,
      inertia_x REAL NOT NULL DEFAULT 0.0,
      inertia_y REAL NOT NULL DEFAULT 0.0,
      last_epoch INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS barbour_snapshots (
      epoch INTEGER PRIMARY KEY,
      stress REAL NOT NULL,
      node_count INTEGER NOT NULL,
      face_count INTEGER NOT NULL,
      sphere_radius REAL NOT NULL,
      centroid_x REAL NOT NULL,
      centroid_y REAL NOT NULL,
      centroid_z REAL NOT NULL,
      alpha_mean REAL NOT NULL DEFAULT 0.0,
      computed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nft_interconnects (
      link_id TEXT PRIMARY KEY,
      from_token_id TEXT NOT NULL,
      to_token_id TEXT NOT NULL,
      link_type TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(from_token_id) REFERENCES nft_tokens(token_id),
      FOREIGN KEY(to_token_id) REFERENCES nft_tokens(token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nft_inter_from ON nft_interconnects(from_token_id);
    CREATE INDEX IF NOT EXISTS idx_nft_inter_to ON nft_interconnects(to_token_id);

    CREATE TABLE IF NOT EXISTS tutte_face_cache (
      epoch INTEGER NOT NULL,
      face_key TEXT NOT NULL,
      nodes_json TEXT NOT NULL,
      area REAL NOT NULL,
      barbour_cx REAL NOT NULL,
      barbour_cy REAL NOT NULL,
      barbour_cz REAL NOT NULL,
      complexity REAL NOT NULL,
      prime_bucket INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (epoch, face_key)
    );
    CREATE INDEX IF NOT EXISTS idx_tutte_face_cache_epoch ON tutte_face_cache(epoch);

    CREATE TABLE IF NOT EXISTS reputation_collapse_events (
      event_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      edge_id TEXT,
      epoch INTEGER NOT NULL,
      collapsed_face_keys_json TEXT NOT NULL,
      collapse_weight REAL NOT NULL,
      guide_alignment REAL NOT NULL,
      alpha_delta REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rep_collapse_user ON reputation_collapse_events(user_id);

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS user_social_links (
      link_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      profile_url TEXT NOT NULL DEFAULT '',
      is_public INTEGER NOT NULL DEFAULT 1,
      verified_admin INTEGER NOT NULL DEFAULT 0,
      verification_code TEXT NOT NULL DEFAULT '',
      bio_verified_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_user_platform_handle ON user_social_links(user_id, platform, handle);

    CREATE TABLE IF NOT EXISTS social_post_nft_refs (
      ref_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      token_id TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT '',
      author_handle_norm TEXT NOT NULL DEFAULT '',
      author_matches_linked_identity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES social_posts(post_id),
      FOREIGN KEY(token_id) REFERENCES nft_tokens(token_id),
      UNIQUE(post_id, token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_post_nft_refs_post ON social_post_nft_refs(post_id);

    CREATE TABLE IF NOT EXISTS joint_kimi_sessions (
      session_id TEXT PRIMARY KEY,
      host_user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      perspective_note TEXT NOT NULL DEFAULT '',
      graph_epoch INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(host_user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_joint_kimi_host ON joint_kimi_sessions(host_user_id);

    CREATE TABLE IF NOT EXISTS joint_kimi_messages (
      message_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES joint_kimi_sessions(session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_kimi_msg_session ON joint_kimi_messages(session_id);

    CREATE TABLE IF NOT EXISTS nfc_phy_taps (
      tap_id TEXT PRIMARY KEY,
      initiator_user_id TEXT NOT NULL,
      target_agent_id TEXT NOT NULL,
      service_id TEXT NOT NULL DEFAULT 'nfc-direct-connection',
      tap_channel TEXT NOT NULL DEFAULT 'nfc_phy',
      proof_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(initiator_user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_nfc_phy_taps_user ON nfc_phy_taps(initiator_user_id);
    CREATE INDEX IF NOT EXISTS idx_nfc_phy_taps_created ON nfc_phy_taps(created_at);
  `);
  migrateNfcDb(db);
}

function migrateNfcDb(db) {
  const nftCols = db.prepare(`PRAGMA table_info(nft_tokens)`).all().map((c) => c.name);
  if (!nftCols.includes('is_face_nft')) {
    db.exec(`ALTER TABLE nft_tokens ADD COLUMN is_face_nft INTEGER NOT NULL DEFAULT 0`);
  }
  if (!nftCols.includes('face_cycle_key')) {
    db.exec(`ALTER TABLE nft_tokens ADD COLUMN face_cycle_key TEXT NOT NULL DEFAULT ''`);
  }
  if (!nftCols.includes('current_owner_user_id')) {
    db.exec(`ALTER TABLE nft_tokens ADD COLUMN current_owner_user_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!nftCols.includes('acquisition_source')) {
    db.exec(`ALTER TABLE nft_tokens ADD COLUMN acquisition_source TEXT NOT NULL DEFAULT 'mint'`);
  }
  if (!nftCols.includes('last_purchase_id')) {
    db.exec(`ALTER TABLE nft_tokens ADD COLUMN last_purchase_id TEXT NOT NULL DEFAULT ''`);
  }
  try {
    db.exec(`
      UPDATE nft_tokens
      SET current_owner_user_id = minted_by_user_id
      WHERE TRIM(COALESCE(current_owner_user_id, '')) = ''
    `);
  } catch (_) { /* ignore */ }

  const userCols = db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name);
  if (!userCols.includes('display_name')) {
    db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!userCols.includes('bio')) {
    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''`);
  }
  if (!userCols.includes('show_social_public')) {
    db.exec(`ALTER TABLE users ADD COLUMN show_social_public INTEGER NOT NULL DEFAULT 1`);
  }

  const linkCols = db.prepare(`PRAGMA table_info(user_social_links)`).all().map((c) => c.name);
  if (!linkCols.includes('verification_code')) {
    db.exec(`ALTER TABLE user_social_links ADD COLUMN verification_code TEXT NOT NULL DEFAULT ''`);
  }
  if (!linkCols.includes('bio_verified_at')) {
    db.exec(`ALTER TABLE user_social_links ADD COLUMN bio_verified_at TEXT NOT NULL DEFAULT ''`);
  }
  try {
    const stale = db
      .prepare(`SELECT link_id FROM user_social_links WHERE trim(coalesce(verification_code,'')) = ''`)
      .all();
    for (const s of stale) {
      db.prepare(`UPDATE user_social_links SET verification_code = ? WHERE link_id = ?`).run(
        generateBioVerificationCode(),
        s.link_id,
      );
    }
  } catch (_) { /* ignore */ }
}

