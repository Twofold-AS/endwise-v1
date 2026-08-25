import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ProxyAgent } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickError } from '../src/errors.ts';
import { getQuickHttpsProxyDispatcher } from '../src/https-proxy.ts';
import { createQuickClient } from '../src/index.ts';
import { probeQuickReadOnly } from '../src/probe.ts';

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'fake-apiv2-ikke-ekte' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  delete process.env.QUICK_HTTPS_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  vi.restoreAllMocks();
});

describe('QUICK_HTTPS_PROXY — valgfri CONNECT (av = fjern env)', () => {
  it('uset/tom → ingen ProxyAgent', () => {
    delete process.env.QUICK_HTTPS_PROXY;
    expect(getQuickHttpsProxyDispatcher()).toBeUndefined();
    process.env.QUICK_HTTPS_PROXY = '';
    expect(getQuickHttpsProxyDispatcher()).toBeUndefined();
    process.env.QUICK_HTTPS_PROXY = '   ';
    expect(getQuickHttpsProxyDispatcher()).toBeUndefined();
  });

  it('HTTPS_PROXY/HTTP_PROXY alene gir ikke ProxyAgent (ikke global proxy)', () => {
    process.env.HTTPS_PROXY = 'http://user:secret@127.0.0.1:3128';
    process.env.HTTP_PROXY = 'http://user:secret@127.0.0.1:3128';
    delete process.env.QUICK_HTTPS_PROXY;
    expect(getQuickHttpsProxyDispatcher()).toBeUndefined();
  });

  it('satt gyldig URL → ProxyAgent', () => {
    process.env.QUICK_HTTPS_PROXY = 'http://user:secret@127.0.0.1:3128';
    expect(getQuickHttpsProxyDispatcher()).toBeInstanceOf(ProxyAgent);
  });

  it('ugyldig URL kaster uten å lekke hemmelighet (CWE-532)', () => {
    process.env.QUICK_HTTPS_PROXY = 'http://user:superhemmelig@/mangler-host';
    expect(() => getQuickHttpsProxyDispatcher()).toThrow(QuickError);
    try {
      getQuickHttpsProxyDispatcher();
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).not.toMatch(/superhemmelig/);
      expect(msg).not.toMatch(/QUICK_HTTPS_PROXY=http/);
      expect(msg).not.toMatch(/mangler-host/);
    }
  });

  it('uten bruker/passord i URL avvises', () => {
    process.env.QUICK_HTTPS_PROXY = 'http://127.0.0.1:3128';
    expect(() => getQuickHttpsProxyDispatcher()).toThrow(QuickError);
  });

  it('probe uten proxy kaller fetch uten dispatcher', async () => {
    delete process.env.QUICK_HTTPS_PROXY;
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly(cfg);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    const init = (kall[1] ?? {}) as RequestInit & { dispatcher?: unknown };
    expect(init.dispatcher).toBeUndefined();
  });

  it('probe med proxy gjør CONNECT til q3.quick.no:443 (ikke live Quick)', async () => {
    const seen: { dest: string; hasAuth: boolean }[] = [];
    const server = http.createServer((_req, res) => {
      res.writeHead(405);
      res.end();
    });
    server.on('connect', (req, socket) => {
      seen.push({
        dest: req.url ?? '',
        hasAuth: Boolean(req.headers['proxy-authorization']),
      });
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    process.env.QUICK_HTTPS_PROXY = `http://user:secret@127.0.0.1:${port}`;
    try {
      await expect(probeQuickReadOnly(cfg)).rejects.toBeInstanceOf(QuickError);
      expect(seen).toEqual([{ dest: 'q3.quick.no:443', hasAuth: true }]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it('customer/batch med proxy bruker samme CONNECT-sti', async () => {
    const seen: string[] = [];
    const server = http.createServer((_req, res) => {
      res.writeHead(405);
      res.end();
    });
    server.on('connect', (req, socket) => {
      seen.push(req.url ?? '');
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    process.env.QUICK_HTTPS_PROXY = `http://user:secret@127.0.0.1:${port}`;
    try {
      await expect(createQuickClient(cfg).customerBatch()).rejects.toBeInstanceOf(QuickError);
      expect(seen).toEqual(['q3.quick.no:443']);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
