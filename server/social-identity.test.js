import { describe, it, expect } from 'vitest';
import {
  normalizeHandle,
  extractNftTokenIds,
  bioTextContainsVerificationCode,
  socialLinkIsVerified,
  generateBioVerificationCode,
} from './social-identity.js';

describe('social-identity', () => {
  it('normalizeHandle strips @ and lowercases', () => {
    expect(normalizeHandle('  @Alice  ')).toBe('alice');
  });

  it('extractNftTokenIds finds nft_ + 32 hex', () => {
    const text = 'check out nft_a1b2c3d4e5f6012345678901234567890123456789012345678901234 and end';
    const ids = extractNftTokenIds(text);
    expect(ids).toHaveLength(1);
    expect(ids[0].startsWith('nft_')).toBe(true);
  });

  it('bioTextContainsVerificationCode is case-insensitive substring', () => {
    const code = 'NFC-deadbeef';
    expect(bioTextContainsVerificationCode('hello NFC-deadbeef world', code)).toBe(true);
    expect(bioTextContainsVerificationCode('nfc-deadbeef', code)).toBe(true);
    expect(bioTextContainsVerificationCode('wrong', code)).toBe(false);
  });

  it('socialLinkIsVerified respects admin or bio timestamp', () => {
    expect(socialLinkIsVerified({ verified_admin: 1 })).toBe(true);
    expect(socialLinkIsVerified({ bio_verified_at: '2026-01-01' })).toBe(true);
    expect(socialLinkIsVerified({ bio_verified_at: '' })).toBe(false);
  });

  it('generateBioVerificationCode has NFC- prefix', () => {
    const c = generateBioVerificationCode();
    expect(c.startsWith('NFC-')).toBe(true);
    expect(c.length).toBeGreaterThan(12);
  });
});
