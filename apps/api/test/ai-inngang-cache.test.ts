import { afterEach, describe, expect, it } from 'vitest';
import {
  KJENTE_NAVN_CACHE_TTL_MS,
  lesKjenteNavnCache,
  MAX_KJENTE_NAVN,
  skrivKjenteNavnCache,
  toemKjenteNavnCache,
} from '../src/lib/ai-inngang.ts';

describe('kjente kundenavn (widget-cache)', () => {
  afterEach(() => {
    toemKjenteNavnCache();
  });

  it('tar maks 200 navn og cacher i fem minutter', () => {
    expect(MAX_KJENTE_NAVN).toBe(200);
    expect(KJENTE_NAVN_CACHE_TTL_MS).toBe(5 * 60_000);
  });

  it('treffer cache per tenant og glemmer utløpt', () => {
    skrivKjenteNavnCache('t-a', ['Ola Nordmann']);
    expect(lesKjenteNavnCache('t-a')).toEqual(['Ola Nordmann']);
    expect(lesKjenteNavnCache('t-b')).toBeNull();

    const etterTtl = Date.now() + KJENTE_NAVN_CACHE_TTL_MS + 1;
    expect(lesKjenteNavnCache('t-a', etterTtl)).toBeNull();
  });
});
