import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { brukerErKundeHosTenant } from '../src/produkt-destinasjon.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function dbMedKunder(rader: { id: string }[]) {
  return {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        execute: async () => undefined,
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => rader,
            }),
          }),
        }),
      };
      return fn(tx);
    },
  };
}

describe('F41-11: kundesesjon er tenant-scopet uten @endwise/db i web', () => {
  it('tom userId / tenant er nei', async () => {
    await expect(
      brukerErKundeHosTenant(dbMedKunder([{ id: 'k1' }]) as never, 't1', ''),
    ).resolves.toBe(false);
    await expect(
      brukerErKundeHosTenant(dbMedKunder([{ id: 'k1' }]) as never, '', 'u1'),
    ).resolves.toBe(false);
  });

  it('kunde hos annen tenant er nei; denne tenanten er ja', async () => {
    await expect(brukerErKundeHosTenant(dbMedKunder([]) as never, 't-bergen', 'u1')).resolves.toBe(
      false,
    );
    await expect(
      brukerErKundeHosTenant(dbMedKunder([{ id: 'k1' }]) as never, 't-bergen', 'u1'),
    ).resolves.toBe(true);
  });

  it('sjekken går på customers.userId under withTenant', () => {
    const dest = les('../src/produkt-destinasjon.ts');
    const fn = dest.slice(dest.indexOf('export async function brukerErKundeHosTenant'));
    expect(fn).toMatch(/withTenant\(db, tenant/);
    expect(fn).toMatch(/schema\.customers\.userId/);
    expect(fn).toMatch(/schema\.customers\.tenantId/);
  });

  it('web-sesjon kaller auth-hjelperen, ikke @endwise/db', () => {
    const web = les('../../../apps/web/app/%5Fkunde/_lib/sesjon.ts');
    const auth = les('../src/kunde-sesjon.ts');
    expect(web).not.toMatch(/@endwise\/db/);
    expect(web).toMatch(/kundeErInnloggetHosSlug/);
    expect(auth).toMatch(/lesTenantIdFraSlug/);
    expect(auth).toMatch(/getSession/);
    expect(auth).toMatch(/brukerErKundeHosTenant/);
    expect(auth).toMatch(/createAuth/);
  });
});
