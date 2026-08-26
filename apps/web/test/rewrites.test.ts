import { describe, expect, it } from 'vitest';
import { streamRewrites } from '../lib/rewrites.ts';

/**
 * Når API-et lever i Next, skal vi ikke lenger proxe auth/tRPC
 * til localhost:3001. Bare `/stream/*` går ut av appen.
 */
describe('streamRewrites', () => {
  it('proxier kun /stream, med default localhost:3002', () => {
    const r = streamRewrites({});
    expect(r).toEqual([{ source: '/stream/:path*', destination: 'http://localhost:3002/:path*' }]);
  });

  it('bruker STREAM_INTERNAL_URL når den er satt', () => {
    const r = streamRewrites({ STREAM_INTERNAL_URL: 'https://stream.example:3002' });
    expect(r[0]?.destination).toBe('https://stream.example:3002/:path*');
  });

  it('har ingen destinasjon mot API_INTERNAL_URL eller :3001', () => {
    const r = streamRewrites({
      API_INTERNAL_URL: 'http://localhost:3001',
      STREAM_INTERNAL_URL: 'http://localhost:3002',
    });
    const destinations = r.map((x) => x.destination).join(' ');
    expect(destinations).not.toContain('3001');
    expect(destinations).not.toContain('API_INTERNAL');
    expect(r.map((x) => x.source)).toEqual(['/stream/:path*']);
  });
});
