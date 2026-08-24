import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistAfterBrowserQuickProbe } from '../lib/quick-browser-probe.ts';

/**
 * F1-07 — browser-probe før persist. Testdata er oppdiktet — aldri en ekte nøkkel.
 */
const cfg = {
  baseUrl: 'https://q3.quick.no/Test_Public',
  token: 'fake-apiv2-ikke-ekte',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('F1-07 — persistAfterBrowserQuickProbe', () => {
  it('kaller ikke persist når GET er 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 401));
    const persist = vi.fn().mockResolvedValue({ ok: true });
    await expect(persistAfterBrowserQuickProbe({ ...cfg, persist })).rejects.toThrow(
      /avviste nøkkelen/i,
    );
    expect(persist).not.toHaveBeenCalled();
  });

  it('kaller ikke persist når GET er 500 — og 500 er ikke nøkkelavvisning', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 500));
    const persist = vi.fn().mockResolvedValue({ ok: true });
    try {
      await persistAfterBrowserQuickProbe({ ...cfg, persist });
      throw new Error('forventet avvisning');
    } catch (error) {
      expect((error as Error).message).toMatch(/svarte 500/i);
      expect((error as Error).message).not.toMatch(/avviste nøkkelen/i);
    }
    expect(persist).not.toHaveBeenCalled();
  });

  it('persisterer først etter 200 JSON', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    const persist = vi.fn().mockResolvedValue({ ok: true });
    await expect(persistAfterBrowserQuickProbe({ ...cfg, persist })).resolves.toEqual({ ok: true });
    expect(persist).toHaveBeenCalledOnce();
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('fetch ble aldri kalt');
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toBeUndefined();
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/Yamaha Bergen/);
  });

  it('kildekoden logger aldri token', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../lib/quick-browser-probe.ts'), 'utf8');
    expect(kilde).not.toMatch(/console\.(log|info|debug|error|warn)/);
    expect(kilde).not.toMatch(/Vercel|allowlist|IP-lås|Static IP/i);
  });
});
