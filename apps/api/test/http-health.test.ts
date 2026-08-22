import { describe, expect, it } from 'vitest';
import { handleHealth } from '../src/http/health.ts';
import { handleHono } from '../src/http/hono.ts';

describe('handleHealth', () => {
  it('svarer 200 uten env eller DB', async () => {
    const res = handleHealth();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body).toMatchObject({ ok: true, service: 'api' });
  });
});

describe('handleHono /health (F13-03)', () => {
  it('treffer samme health gjennom Hono-skallet', async () => {
    const res = await handleHono(new Request('http://endwise.test/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: 'api' });
  });
});
