import { describe, it, expect } from 'vitest';
import { parseScrapeUrl } from './social-scrape.js';

describe('parseScrapeUrl', () => {
  it('accepts https public hosts', () => {
    const p = parseScrapeUrl('https://example.com/x');
    expect(p.ok).toBe(true);
    expect(p.url).toContain('example.com');
  });

  it('rejects localhost', () => {
    expect(parseScrapeUrl('http://localhost/foo').ok).toBe(false);
    expect(parseScrapeUrl('http://127.0.0.1/x').ok).toBe(false);
  });

  it('rejects non-http schemes', () => {
    expect(parseScrapeUrl('file:///etc/passwd').ok).toBe(false);
  });
});
