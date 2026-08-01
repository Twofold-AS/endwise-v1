import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cronAuth, evaluateCronAuth } from '../src/lib/cron-auth.ts';

/**
 * F8-01 / CWE-306 — Delt cron-guard. Beviser at cron-endepunkter feiler LUKKET:
 * mangler CRON_SECRET → stengt; feil/manglende Bearer → 401; riktig → gjennom.
 * Rene tester + in-memory Hono (`app.request`), ingen Docker/nettverk.
 */
describe('evaluateCronAuth (ren)', () => {
  it('mangler secret → missing-secret (feil lukket)', () => {
    expect(evaluateCronAuth('Bearer x', undefined)).toBe('missing-secret');
    expect(evaluateCronAuth('Bearer x', '')).toBe('missing-secret');
  });
  it('riktig Bearer → ok', () => {
    expect(evaluateCronAuth('Bearer hemmelig', 'hemmelig')).toBe('ok');
  });
  it('feil/manglende Bearer → unauthorized', () => {
    expect(evaluateCronAuth('Bearer feil', 'hemmelig')).toBe('unauthorized');
    expect(evaluateCronAuth(undefined, 'hemmelig')).toBe('unauthorized');
    expect(evaluateCronAuth('hemmelig', 'hemmelig')).toBe('unauthorized'); // uten «Bearer »
  });
});

describe('cronAuth-middleware (in-memory Hono)', () => {
  const app = new Hono().use('*', cronAuth).get('/', (c) => c.json({ ran: true }));
  const ORIG = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = 'topphemmelig';
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIG;
  });

  it('503 når CRON_SECRET mangler', async () => {
    delete process.env.CRON_SECRET;
    const res = await app.request('/');
    expect(res.status).toBe(503);
  });

  it('401 uten Authorization', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });

  it('401 med feil token', async () => {
    const res = await app.request('/', { headers: { authorization: 'Bearer feil' } });
    expect(res.status).toBe(401);
  });

  it('200 med riktig token', async () => {
    const res = await app.request('/', { headers: { authorization: 'Bearer topphemmelig' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: true });
  });
});
