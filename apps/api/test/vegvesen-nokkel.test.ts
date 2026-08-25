import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F2-08 — Vegvesen-nøkkelen er server-only. Disse testene leser kilden
 * slik at et tilbakefall til `process.env` i klienten, eller et felt som
 * returnerer nøkkelen, blir rødt.
 */

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F2-08: Vegvesen-nøkkel forlater ikke serveren', () => {
  it('config-svaret er bare hasKey', () => {
    const ruter = les('../src/trpc/routers/vegvesen.ts');
    expect(ruter).toMatch(/getView/);
    expect(ruter).toMatch(/hasKey: true/);
    expect(ruter).not.toMatch(/decryptSecret/);
    expect(ruter).not.toMatch(/console\.(log|info|debug|warn)/);
  });

  it('lookup henter nøkkelen server-side, uten å logge den', () => {
    const lookup = les('../src/trpc/routers/lookup.ts');
    expect(lookup).toMatch(/hentVegvesenApiNokkel/);
    expect(lookup).not.toMatch(/process\.env\.VEGVESEN_API_KEY/);
    expect(lookup).not.toMatch(/console\.(log|info|debug|warn)/);
  });

  it('web-flaten bundler ikke VEGVESEN_API_KEY', () => {
    const side = les('../../web/app/(app)/integrasjoner/vegvesen/page.tsx');
    expect(side).toMatch(/trpc\.vegvesen\.config/);
    expect(side).toMatch(/hasKey/);
    expect(side).not.toMatch(/VEGVESEN_API_KEY/);
    expect(side).not.toMatch(/process\.env/);
  });
});
