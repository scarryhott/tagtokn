import crypto from 'crypto';
import { id as makeId, nowIso } from './ids.js';

function scryptHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${scryptHash(password, salt)}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const i = stored.indexOf(':');
  if (i < 0) return false;
  const salt = stored.slice(0, i);
  const hash = stored.slice(i + 1);
  const test = scryptHash(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

export function parseBearer(req) {
  const h = req.get('authorization') || req.get('Authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

export function getSessionUserId(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`).get(token);
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  return row.user_id;
}

export function createSession(db, userId, ttlMs = 30 * 86400000) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(
    token,
    userId,
    expiresAt,
    nowIso(),
  );
  return { token, expiresAt };
}

export function registerUser(db, { username, password }) {
  const u = String(username || '').trim();
  if (u.length < 2) throw new Error('username_invalid');
  if (!password || String(password).length < 6) throw new Error('password_invalid');
  const userId = makeId('usr');
  const passwordHash = hashPassword(password);
  try {
    db.prepare(`INSERT INTO users (user_id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`).run(
      userId,
      u,
      passwordHash,
      nowIso(),
    );
  } catch (e) {
    if (String(e?.message || e).includes('UNIQUE')) throw new Error('username_taken');
    throw e;
  }
  return { userId, username: u };
}

export function loginUser(db, { username, password }) {
  const u = String(username || '').trim();
  const row = db.prepare(`SELECT user_id, username, password_hash FROM users WHERE username = ?`).get(u);
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error('invalid_credentials');
  }
  return { userId: row.user_id, username: row.username };
}

export function requireAuth(db) {
  return (req, res, next) => {
    const token = parseBearer(req);
    const userId = getSessionUserId(db, token);
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Bearer session required' });
    }
    req.auth = { userId, token };
    next();
  };
}

export function effectiveNftOwnerRow(row) {
  if (!row) return '';
  const o = row.current_owner_user_id;
  if (o && String(o).trim()) return String(o);
  return row.minted_by_user_id || '';
}
