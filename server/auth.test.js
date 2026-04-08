import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth.js';

describe('auth', () => {
  it('hashPassword + verifyPassword roundtrip', () => {
    const h = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
  });

  it('verifyPassword rejects malformed stored', () => {
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'nocolon')).toBe(false);
  });
});
