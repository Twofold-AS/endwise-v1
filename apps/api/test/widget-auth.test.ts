import { signWidgetToken } from '@endwise/modules/widget';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { widgetAuth, type WidgetVars } from '../src/lib/widget-auth.ts';

/**
 * F4-02 — Widget-auth-middleware. In-memory Hono (`app.request`), ingen Docker.
 * Beviser at flaten feiler lukket uten et gyldig kortlevd token, og at et gyldig
 * token gir tenant-kontekst.
 */
describe('widgetAuth-middleware', () => {
  const SECRET = 'widget-test-secret';
  const app = new Hono<{ Variables: WidgetVars }>()
    .use('*', widgetAuth)
    .get('/', (c) => c.json({ tid: c.get('widgetTenantId'), cid: c.get('widgetCid') }));

  const ORIG = process.env.WIDGET_TOKEN_SECRET;
  beforeEach(() => {
    process.env.WIDGET_TOKEN_SECRET = SECRET;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.WIDGET_TOKEN_SECRET;
    else process.env.WIDGET_TOKEN_SECRET = ORIG;
  });

  it('401 uten Authorization', async () => {
    expect((await app.request('/')).status).toBe(401);
  });

  it('401 med ugyldig token', async () => {
    const res = await app.request('/', { headers: { authorization: 'Bearer tull.tull.tull' } });
    expect(res.status).toBe(401);
  });

  it('401 med token signert av feil hemmelighet', async () => {
    const forged = signWidgetToken({ tid: 'a', cid: 'customer:1' }, 'annen-secret');
    const res = await app.request('/', { headers: { authorization: `Bearer ${forged}` } });
    expect(res.status).toBe(401);
  });

  it('200 + tenant-kontekst med gyldig token', async () => {
    const token = signWidgetToken({ tid: 'tenant-a', cid: 'customer:42' }, SECRET);
    const res = await app.request('/', { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tid: 'tenant-a', cid: 'customer:42' });
  });
});
