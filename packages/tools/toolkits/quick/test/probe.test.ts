import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickAuthError, QuickError } from '../src/errors.ts';
import {
  probeQuickReadOnly,
  QUICK_PROBE_USER_AGENT,
  QUICK_READ_ONLY_PROBE_METHOD,
  QUICK_READ_ONLY_PROBE_PATH,
} from '../src/probe.ts';
import { QUICK_PROBE_USER_MESSAGES, quickProbeUserMessage } from '../src/probe-error.ts';

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'fake-apiv2-ikke-ekte' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('F1-07 — GET-only Quick-probe', () => {
  it('proben er GET mot /api/v2/client/info — ingen skriveverb', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly(cfg);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    const init = (kall[1] ?? {}) as RequestInit;
    expect(init.method).toBe('GET');
    expect(init.method).toBe(QUICK_READ_ONLY_PROBE_METHOD);
    expect(['POST', 'PUT', 'PATCH', 'DELETE']).not.toContain(init.method);
    expect(String(kall[0])).toBe('https://q3.quick.no/Test_Public/api/v2/client/info');
    expect(String(kall[0])).toContain(QUICK_READ_ONLY_PROBE_PATH);
    expect(init.redirect).toBe('error');
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers['User-Agent']).toBe(QUICK_PROBE_USER_AGENT);
    expect(headers['User-Agent']).toBe('Endwise/1 QuickProbe');
    expect(headers.Accept).toBe('application/json');
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
  });

  it('nettleser-probe utelater User-Agent (forbidden + CORS allow-headers)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly({ ...cfg, includeUserAgent: false });
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toBeUndefined();
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(headers.Accept).toBe('application/json');
    expect((kall[1] as RequestInit).credentials).toBe('omit');
  });

  it('baseUrl som slutter på /api/v2 treffer ikke /api/v2/api/v2/client/info', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly({
      ...cfg,
      baseUrl: 'https://q3.quick.no/ProdShared008/api/v2',
    });
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toBe('https://q3.quick.no/ProdShared008/api/v2/client/info');
    expect(url).not.toContain('/api/v2/api/v2/');
  });

  it('HTTP 500 fra Quick er ikke auth-feil', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 500));
    await expect(probeQuickReadOnly(cfg)).rejects.toBeInstanceOf(QuickError);
    await expect(probeQuickReadOnly(cfg)).rejects.not.toBeInstanceOf(QuickAuthError);
    try {
      await probeQuickReadOnly(cfg);
      throw new Error('forventet avvisning');
    } catch (error) {
      expect(error).toBeInstanceOf(QuickError);
      expect(error).not.toBeInstanceOf(QuickAuthError);
      expect((error as QuickError).status).toBe(500);
      const msg = quickProbeUserMessage(error);
      expect(msg).toBe(QUICK_PROBE_USER_MESSAGES.http500);
      expect(msg).not.toBe(QUICK_PROBE_USER_MESSAGES.rejected);
    }
  });

  it('Help/swagger-URL treffer origin + slug, ikke docs-stien', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly({
      ...cfg,
      baseUrl: 'https://q3.quick.no/ProdShared008/Help/Api/GET-api-v2-client-info',
    });
    expect(String(spy.mock.calls[0]?.[0])).toBe(
      'https://q3.quick.no/ProdShared008/api/v2/client/info',
    );
  });

  it('striper Token token=-wrapper før Authorization', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await probeQuickReadOnly({
      ...cfg,
      token: 'Token token=fake-apiv2-ikke-ekte',
    });
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(headers.Authorization).not.toContain('Token token=Token token=');
  });

  it('avviser svar større enn MAX_RESPONSE_BYTES uten å parse JSON', async () => {
    const { MAX_RESPONSE_BYTES } = await import('../src/probe.ts');
    expect(MAX_RESPONSE_BYTES).toBe(256_000);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x'.repeat(MAX_RESPONSE_BYTES + 1), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': String(MAX_RESPONSE_BYTES + 1),
        },
      }),
    );
    await expect(probeQuickReadOnly(cfg)).rejects.toThrow(/for stort/i);
  });

  it('kildekoden til proben inneholder ingen skriveverb mot Quick', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../src/probe.ts'), 'utf8');
    expect(kilde).toMatch(/method:\s*QUICK_READ_ONLY_PROBE_METHOD|method:\s*['"]GET['"]/);
    expect(kilde).not.toMatch(/['"]POST['"]/);
    expect(kilde).not.toMatch(/['"]PUT['"]/);
    expect(kilde).not.toMatch(/['"]PATCH['"]/);
    expect(kilde).not.toMatch(/['"]DELETE['"]/);
    expect(kilde).not.toMatch(/pullNow|pushNow|customer\/batch/);
    expect(kilde).not.toMatch(/fake-apiv2-ikke-ekte|ProdShared008\/[A-Za-z0-9]{8,}/);
    expect(kilde).not.toMatch(/console\.(log|info|debug|error|warn)/);
    expect(kilde).not.toMatch(/Yamaha Bergen/);
  });
});
