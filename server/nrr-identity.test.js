import { describe, it, expect } from 'vitest';
import { computeNrrGenesisDigest } from './nrr-identity.js';

describe('NRR identity genesis', () => {
  it('digest is stable for canonical mint fields', () => {
    const row = {
      tokenId: 'tok-1',
      nodeId: 'node-1',
      mintedFromPostId: 'post-1',
      mintedByUserId: 'alice',
      mintedAt: '2026-01-01T00:00:00.000Z',
      noveltyScore: 0.42,
      connectivity: 3,
    };
    const a = computeNrrGenesisDigest(row);
    const b = computeNrrGenesisDigest(row);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('digest changes when minter changes', () => {
    const base = {
      tokenId: 'tok-1',
      nodeId: 'node-1',
      mintedFromPostId: 'post-1',
      mintedByUserId: 'alice',
      mintedAt: '2026-01-01T00:00:00.000Z',
      noveltyScore: 0,
      connectivity: 0,
    };
    const d1 = computeNrrGenesisDigest(base);
    const d2 = computeNrrGenesisDigest({ ...base, mintedByUserId: 'bob' });
    expect(d1).not.toBe(d2);
  });
});
