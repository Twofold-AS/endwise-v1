import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('search.global — eksisterende CRM, ingen fake treff', () => {
  it('er montert på appRouter', () => {
    expect(appRouter._def.procedures).toBeDefined();
    const kilde = readFileSync(resolve(her, '../src/trpc/router.ts'), 'utf8');
    expect(kilde).toMatch(/search: searchRouter/);
  });

  it('spør kunder, jobber, innboks, kjøretøy, deler, team, tjenester og hjelp', () => {
    const kilde = readFileSync(resolve(her, '../src/trpc/routers/search.ts'), 'utf8');
    expect(kilde).toMatch(/kategori: 'Kunde'/);
    expect(kilde).toMatch(/kategori: 'Jobber'/);
    expect(kilde).toMatch(/kategori: 'Innboks'/);
    expect(kilde).toMatch(/kategori: 'Kjøretøy'/);
    expect(kilde).toMatch(/ilike\(schema\.customers\.name/);
    expect(kilde).toMatch(/normaliserSok/);
    expect(kilde).not.toMatch(/fake|mockTreff|demoKunde/);
  });
});
