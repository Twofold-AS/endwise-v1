import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptSecret, encryptSecret } from '@endwise/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aktiverQuickEtterGet } from '../src/lib/quick-activate.ts';

/**
 * F1-07 — forhandlerens EGEN Quick-nøkkel: GET-probe FØR persist/aktivering.
 * Testdata er oppdiktet — aldri en ekte ApiV2-nøkkel.
 */
const FAKE_TOKEN = 'fake-apiv2-ikke-ekte';
const BASE = 'https://q3.quick.no/Test_Public';

afterEach(() => vi.restoreAllMocks());

describe('F1-07 — aktiver Quick først etter vellykket GET', () => {
  it('feilet GET persisterer ikke nøkkelen og aktiverer ikke modulen', async () => {
    const persist = vi.fn();
    const enableModule = vi.fn();
    const probe = vi.fn().mockRejectedValue(new Error('Quick avviste token (401/403)'));

    await expect(
      aktiverQuickEtterGet({
        probe,
        persist,
        enableModule,
        baseUrl: BASE,
        token: FAKE_TOKEN,
      }),
    ).rejects.toThrow(/avviste|Quick/i);

    expect(probe).toHaveBeenCalledOnce();
    expect(persist).not.toHaveBeenCalled();
    expect(enableModule).not.toHaveBeenCalled();
  });

  it('vellykket GET-sti krypterer og lagrer aldri klartekst', async () => {
    const kek = Buffer.alloc(32, 9);
    const rader: Array<{ baseUrl: string; tokenCipher: string }> = [];
    const enableModule = vi.fn();

    await aktiverQuickEtterGet({
      probe: async () => undefined,
      persist: async ({ baseUrl, token }) => {
        rader.push({ baseUrl, tokenCipher: encryptSecret(token, kek) });
      },
      enableModule,
      baseUrl: BASE,
      token: FAKE_TOKEN,
    });

    expect(rader).toHaveLength(1);
    expect(rader[0]?.baseUrl).toBe(BASE);
    expect(rader[0]?.tokenCipher).not.toContain(FAKE_TOKEN);
    expect(JSON.stringify(rader)).not.toContain(FAKE_TOKEN);
    expect(decryptSecret(rader[0]?.tokenCipher ?? '', kek)).toBe(FAKE_TOKEN);
    expect(enableModule).toHaveBeenCalledOnce();
  });

  it('proben i setConfig/fullfor er GET-first — ingen persist før probe', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const activate = readFileSync(resolve(her, '../src/lib/quick-activate.ts'), 'utf8');
    const quick = readFileSync(resolve(her, '../src/trpc/routers/quick.ts'), 'utf8');
    const onboard = readFileSync(resolve(her, '../src/trpc/routers/onboarding.ts'), 'utf8');
    const probe = readFileSync(
      resolve(her, '../../../packages/tools/toolkits/quick/src/probe.ts'),
      'utf8',
    );

    expect(activate).toMatch(/await opts\.probe\(/);
    const probeIdx = activate.indexOf('await opts.probe(');
    const persistIdx = activate.indexOf('await opts.persist(');
    expect(probeIdx).toBeGreaterThan(-1);
    expect(persistIdx).toBeGreaterThan(probeIdx);

    expect(quick).toMatch(/aktiverQuickEtterGet|probeQuickReadOnly/);
    expect(quick).toMatch(/setConfig/);
    expect(onboard).toMatch(/aktiverQuickEtterGet|probeQuickReadOnly/);
    expect(onboard).toMatch(/extras\.includes\(['"]quick['"]\)|extras\.includes\("quick"\)/);

    expect(probe).toMatch(/['"]GET['"]/);
    expect(probe).not.toMatch(/['"]POST['"]|['"]PUT['"]|['"]PATCH['"]|['"]DELETE['"]/);
    expect(activate).not.toMatch(/pullNow|pushNow/);
    expect(`${activate}\n${quick}\n${onboard}`).not.toMatch(
      /ENDWISE_KEK\s*=\s*['"][A-Za-z0-9+/=]{20,}/,
    );
  });
});
