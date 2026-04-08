import crypto from 'crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

