import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickError } from '../src/errors.ts';
import {
  GATEWAY_SECRET_HEADER,
  getQuickGatewayBaseUrl,
  rewriteQuickUrlForGateway,
} from '../src/gateway.ts';
import {
  getQuickHttp11Dispatcher,
  getQuickHttpsProxyDispatcher,
  QUICK_CURL_USER_AGENT,
} from '../src/https-proxy.ts';
import { createQuickClient } from '../src/index.ts';
import { probeQuickReadOnly } from '../src/probe.ts';

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'fake-apiv2-ikke-ekte' };
const SECRET = 'gw-secret-ikke-ekte';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  delete process.env.QUICK_GATEWAY_URL;
  delete process.env.QUICK_GATEWAY_SECRET;
  delete process.env.QUICK_HTTPS_PROXY;
  vi.restoreAllMocks();
});

describe('QUICK_GATEWAY_URL — valgfri live-gateway (av = fjern env)', () => {
  it('uset/tom → ingen omskriving', () => {
    delete process.env.QUICK_GATEWAY_URL;
    expect(getQuickGatewayBaseUrl()).toBeUndefined();
    process.env.QUICK_GATEWAY_URL = '';
    expect(getQuickGatewayBaseUrl()).toBeUndefined();
    process.env.QUICK_GATEWAY_URL = '   ';
    expect(getQuickGatewayBaseUrl()).toBeUndefined();
  });

  it('ugyldig URL / credentials i URL avvises uten å lekke hemmelighet (CWE-532)', () => {
    process.env.QUICK_GATEWAY_URL = 'http://user:superhemmelig@/mangler-host';
    expect(() => getQuickGatewayBaseUrl()).toThrow(QuickError);
    try {
      getQuickGatewayBaseUrl();
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).not.toMatch(/superhemmelig/);
      expect(msg).not.toMatch(/QUICK_GATEWAY_URL=http/);
      expect(msg).not.toMatch(/mangler-host/);
    }
  });

  it('satt URL uten secret → fail-closed', async () => {
    process.env.QUICK_GATEWAY_URL = 'https://gw.example:8443';
    delete process.env.QUICK_GATEWAY_SECRET;
    const spy = vi.spyOn(globalThis, 'fetch');
    await expect(probeQuickReadOnly(cfg)).rejects.toBeInstanceOf(QuickError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('probe/setConfig-stien går via gateway med dealer-token + secret', async () => {
    process.env.QUICK_GATEWAY_URL = 'https://gw.example:8443';
    process.env.QUICK_GATEWAY_SECRET = SECRET;
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly(cfg);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    expect(String(kall[0])).toBe('https://gw.example:8443/Test_Public/api/v2/client/info');
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(headers[GATEWAY_SECRET_HEADER]).toBe(SECRET);
    expect(headers.Accept).toBe('application/json');
    expect(headers['User-Agent']).toBe(QUICK_CURL_USER_AGENT);
    const init = (kall[1] ?? {}) as RequestInit & { dispatcher?: unknown };
    expect(init.dispatcher).toBe(getQuickHttp11Dispatcher());
  });

  it('customer/batch går samme gateway-sti (svar brukes som direkte Quick-kall)', async () => {
    process.env.QUICK_GATEWAY_URL = 'https://gw.example:8443/';
    process.env.QUICK_GATEWAY_SECRET = SECRET;
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ totalCount: 0, limit: 10, offset: 0, results: [] }));
    const batch = await createQuickClient(cfg).customerBatch({ limit: 10, offset: 0 });
    expect(batch.results).toEqual([]);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    expect(String(kall[0])).toBe(
      'https://gw.example:8443/Test_Public/api/v2/customer/batch?limit=10&offset=0',
    );
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers[GATEWAY_SECRET_HEADER]).toBe(SECRET);
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(headers['User-Agent']).toBe(QUICK_CURL_USER_AGENT);
  });

  it('gateway slår CONNECT — QUICK_HTTPS_PROXY ignoreres når gateway er satt', async () => {
    process.env.QUICK_GATEWAY_URL = 'https://gw.example:8443';
    process.env.QUICK_GATEWAY_SECRET = SECRET;
    process.env.QUICK_HTTPS_PROXY = 'http://user:secret@127.0.0.1:3128';
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly(cfg);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/^https:\/\/gw\.example:8443\//);
    const init = (spy.mock.calls[0]?.[1] ?? {}) as RequestInit & { dispatcher?: unknown };
    expect(init.dispatcher).toBe(getQuickHttp11Dispatcher());
    expect(getQuickHttpsProxyDispatcher()).toBeDefined();
  });

  it('rewrite bytter kun origin', () => {
    expect(
      rewriteQuickUrlForGateway(
        'https://q3.quick.no/Test_Public/api/v2/item/batch?limit=1',
        'https://gw.example:8443',
      ),
    ).toBe('https://gw.example:8443/Test_Public/api/v2/item/batch?limit=1');
  });
});
