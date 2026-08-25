import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_QUICK_API_PATHS,
  ALLOWED_QUICK_HOST,
  createQuickGateway,
  GATEWAY_SECRET_HEADER,
  matchAllowedQuickPath,
} from '../../../../../ops/quick-gateway/gateway.mjs';

const SECRET = 'test-gateway-secret-ikke-ekte';
const TOKEN = 'fake-apiv2-ikke-ekte-persist';
const INFO = '/Test_Public/api/v2/client/info';

const her = dirname(fileURLToPath(import.meta.url));
const gatewaySrc = readFileSync(
  resolve(her, '../../../../../ops/quick-gateway/gateway.mjs'),
  'utf8',
);
const unitSrc = readFileSync(
  resolve(her, '../../../../../ops/quick-gateway/quick-gateway.service'),
  'utf8',
);

afterEach(() => {
  delete process.env.GATEWAY_SECRET;
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function gatewayGet(
  port: number,
  path: string,
  opts: { secret?: string; token?: string; bearer?: boolean } = {},
): Promise<{ status: number; body: string; headers: Headers }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.secret !== undefined && opts.bearer) {
    headers.Authorization = `Bearer ${opts.secret}`;
  } else if (opts.secret !== undefined) {
    headers['X-Endwise-Gateway-Secret'] = opts.secret;
  }
  if (opts.token !== undefined) {
    headers.Authorization = `Token token=${opts.token}`;
  }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'GET', headers });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

describe('ops/quick-gateway — allowlist + secret + ingen persist/logg', () => {
  it('mangler GATEWAY_SECRET → kaster (fail-closed, CWE-306)', () => {
    expect(() => createQuickGateway({ secret: '', log: () => undefined })).toThrow(
      /GATEWAY_SECRET/,
    );
  });

  it('allowlist matcher kun de fire GET-stiene under instans-slug', () => {
    expect(ALLOWED_QUICK_HOST).toBe('q3.quick.no');
    expect(ALLOWED_QUICK_API_PATHS).toEqual([
      '/api/v2/client/info',
      '/api/v2/customer/batch',
      '/api/v2/item/batch',
      '/api/v2/stockentry/batch',
    ]);
    expect(matchAllowedQuickPath(INFO)).toEqual({ pathname: INFO, search: '' });
    expect(matchAllowedQuickPath('/Test_Public/api/v2/customer/batch?limit=10')).toEqual({
      pathname: '/Test_Public/api/v2/customer/batch',
      search: '?limit=10',
    });
    expect(matchAllowedQuickPath('/ProdShared008/api/v2/item/batch')).toBeTruthy();
    expect(matchAllowedQuickPath('/Test_Public/api/v2/stockentry/batch')).toBeTruthy();
  });

  it('path allowlist avviser fremmed sti — ingen upstream (CWE-441/918)', async () => {
    const seen: string[] = [];
    const gw = createQuickGateway({
      secret: SECRET,
      log: () => undefined,
      fetch: async (url) => {
        seen.push(String(url));
        return jsonResponse({});
      },
    });
    const { port, close } = await gw.listen(0);
    try {
      for (const path of [
        '/Test_Public/api/v2/admin',
        '/Test_Public/api/v2/users',
        '/Test_Public/api/v2/client/info/../users',
        '/Test_Public/api/v1/client/info',
        '/api/v2/client/info',
        '/Test_Public/extra/api/v2/client/info',
      ]) {
        const res = await gatewayGet(port, path, { secret: SECRET, token: TOKEN });
        expect(res.status, path).toBe(403);
      }
      expect(seen).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it('uten/feil secret → 401, ingen upstream (CWE-290, ikke IP-only)', async () => {
    const seen: unknown[] = [];
    const gw = createQuickGateway({
      secret: SECRET,
      log: () => undefined,
      fetch: async (url) => {
        seen.push(url);
        return jsonResponse({});
      },
    });
    const { port, close } = await gw.listen(0);
    try {
      expect((await gatewayGet(port, INFO, { token: TOKEN })).status).toBe(401);
      expect((await gatewayGet(port, INFO, { secret: 'feil', token: TOKEN })).status).toBe(401);
      expect(seen).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it('happy-path: videresender til q3.quick.no med per-request token, streamer svar', async () => {
    const seen: { url: string; auth: string | undefined; hasGwSecret: boolean }[] = [];
    const payload = { guid: 'probe-ok', source: 'mocked-quick' };
    const gw = createQuickGateway({
      secret: SECRET,
      log: () => undefined,
      fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        seen.push({
          url: String(url),
          auth: headers.get('authorization') ?? undefined,
          hasGwSecret: headers.has(GATEWAY_SECRET_HEADER),
        });
        return jsonResponse(payload);
      },
    });
    const { port, close } = await gw.listen(0);
    try {
      const res = await gatewayGet(port, `${INFO}?x=1`, { secret: SECRET, token: TOKEN });
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual(payload);
      expect(seen).toEqual([
        {
          url: `https://q3.quick.no${INFO}?x=1`,
          auth: `Token token=${TOKEN}`,
          hasGwSecret: false,
        },
      ]);
    } finally {
      await close();
    }
  });

  it('token skrives ikke til disk (CWE-922)', async () => {
    const unique = `tok-disk-${Date.now()}-ikke-ekte`;
    const gw = createQuickGateway({
      secret: SECRET,
      log: () => undefined,
      fetch: async () => jsonResponse({}),
    });
    const { port, close } = await gw.listen(0);
    try {
      const res = await gatewayGet(port, INFO, { secret: SECRET, token: unique });
      expect(res.status).toBe(200);
    } finally {
      await close();
    }
    expect(process.env.QUICK_TOKEN).toBeUndefined();
    expect(JSON.stringify(process.env)).not.toContain(unique);
    expect(gatewaySrc).not.toMatch(/writeFile|appendFile|createWriteStream/);
    expect(gatewaySrc).not.toMatch(/QUICK_TOKEN\s*=/);
    expect(gatewaySrc).toMatch(/token = ''/);
  });

  it('logg er kun timestamp, status og varighet — aldri body/header/token (CWE-532)', async () => {
    const lines: string[] = [];
    const gw = createQuickGateway({
      secret: SECRET,
      log: (line) => lines.push(line),
      fetch: async () => jsonResponse({ hemmelig: 'kropp-skal-ikke-logges', token: TOKEN }),
    });
    const { port, close } = await gw.listen(0);
    try {
      await gatewayGet(port, `${INFO}?email=hemmelig@example.invalid`, {
        secret: SECRET,
        token: TOKEN,
      });
      await gatewayGet(port, '/ikke/lov', { secret: SECRET, token: TOKEN });
      await gatewayGet(port, INFO, { token: TOKEN });
    } finally {
      await close();
    }
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\S+ \d{3} \d+ms$/);
      expect(line).not.toMatch(/test-gateway-secret-ikke-ekte/);
      expect(line).not.toMatch(/fake-apiv2-ikke-ekte-persist/);
      expect(line).not.toMatch(/Authorization/i);
      expect(line).not.toMatch(/client\/info/);
      expect(line).not.toMatch(/hemmelig/);
      expect(line).not.toMatch(/kropp-skal-ikke-logges/);
      expect(line).not.toMatch(/email=/);
    }
    expect(lines.some((l) => l.includes(' 200 '))).toBe(true);
    expect(lines.some((l) => l.includes(' 403 '))).toBe(true);
    expect(lines.some((l) => l.includes(' 401 '))).toBe(true);
  });

  it('systemd-unit har ikke MemoryDenyWriteExecute (Node krasjet på boksen)', () => {
    expect(unitSrc).not.toMatch(/^\s*MemoryDenyWriteExecute=/m);
    expect(unitSrc).toMatch(/MemoryDenyWriteExecute=yes er BEVISST UTENFOR/);
  });
});
