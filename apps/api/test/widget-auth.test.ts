import { signWidgetToken } from '@endwise/modules/widget';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWidgetCors, type WidgetVars, widgetAuth } from '../src/lib/widget-auth.ts';

/**
 * Widget-auth-middleware. In-memory Hono (`app.request`), ingen Docker.
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

describe('widgetCors (ZAP 10098)', () => {
  const tillatt = 'https://verksted.no';
  const nokkel = 'pk_live_ok';
  const app = new Hono()
    .use(
      '*',
      createWidgetCors({
        erProduksjon: false,
        hentTillatteOrigins: async (k) => (k === nokkel ? [tillatt] : []),
      }),
    )
    .get('/', (c) => c.json({ ok: true }))
    .post('/', (c) => c.json({ ok: true }));

  it('speiler kun origins i nøkkelens allowedOrigins — aldri *', async () => {
    const res = await app.request('/', {
      headers: { origin: 'https://Verksted.NO/booking', 'x-widget-key': nokkel },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(tillatt);
    expect(res.headers.get('Vary')).toBe('Origin');
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });

  it('setter ikke ACAO når origin ikke er i allowlisten', async () => {
    const res = await app.request('/', {
      headers: { origin: 'https://evil.example', 'x-widget-key': nokkel },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('setter alltid Vary: Origin, også uten Origin-header', async () => {
    const uten = await app.request('/');
    expect(uten.headers.get('Vary')).toBe('Origin');
    expect(uten.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('setter ikke ACAO for manglende, null eller ugyldig origin', async () => {
    const noll = await app.request('/', {
      headers: { origin: 'null', 'x-widget-key': nokkel },
    });
    expect(noll.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const stjerne = await app.request('/', {
      headers: { origin: '*', 'x-widget-key': nokkel },
    });
    expect(stjerne.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('svarer 204 på preflight og speiler https uten nøkkel', async () => {
    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: { origin: 'https://verksted.no' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(tillatt);
    expect(res.headers.get('Vary')).toBe('Origin');
    expect(res.headers.get('Access-Control-Allow-Methods')).toMatch(/GET/);
    expect(res.headers.get('Access-Control-Allow-Headers')).toMatch(/X-Widget-Key/);
  });

  it('avviser http: i produksjon', async () => {
    const prod = new Hono()
      .use(
        '*',
        createWidgetCors({
          erProduksjon: true,
          hentTillatteOrigins: async () => ['http://localhost:3000', tillatt],
        }),
      )
      .get('/', (c) => c.json({ ok: true }));

    const httpRes = await prod.request('/', {
      headers: { origin: 'http://localhost:3000', 'x-widget-key': nokkel },
    });
    expect(httpRes.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(httpRes.headers.get('Vary')).toBe('Origin');

    const preflight = await prod.request('/', {
      method: 'OPTIONS',
      headers: { origin: 'http://evil.example' },
    });
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const httpsRes = await prod.request('/', {
      headers: { origin: tillatt, 'x-widget-key': nokkel },
    });
    expect(httpsRes.headers.get('Access-Control-Allow-Origin')).toBe(tillatt);
  });

  it('tillater http: utenfor produksjon når origin står i allowlisten', async () => {
    const res = await app.request('/', {
      headers: { origin: 'http://localhost:3000', 'x-widget-key': nokkel },
    });
    // localhost står ikke i allowlisten for denne nøkkelen.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const medHttp = new Hono()
      .use(
        '*',
        createWidgetCors({
          erProduksjon: false,
          hentTillatteOrigins: async () => ['http://localhost:3000'],
        }),
      )
      .get('/', (c) => c.json({ ok: true }));
    const ok = await medHttp.request('/', {
      headers: { origin: 'http://localhost:3000', 'x-widget-key': nokkel },
    });
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});
