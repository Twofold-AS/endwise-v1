import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { forhandlerVerifyMedlemskap } from '../src/magic-link-2fa.ts';
import { erKundeHostDestinasjon } from '../src/produkt-destinasjon.ts';

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

describe('F41-10: kunde-OTP er tenant-scopet', () => {
  it('fremmed e-post: ingen dest, ingen e-post, ingen auto-opprett', async () => {
    await expect(
      erKundeHostDestinasjon(dbMedKunder([]) as never, 'tenant-bergen', 'fremmed@evil.no'),
    ).resolves.toBe(false);
    const auth = les('../src/auth.ts');
    const send = auth.slice(auth.indexOf('sendMagicLink: async'), auth.indexOf('...(platform'));
    expect(send).toMatch(/if \(!\(await destinasjon\(db, email\)\)\) return/);
    expect(send).toMatch(/if \(sone === 'forhandler'\)/);
    expect(send).toMatch(/if \(!tenantId\) return/);
    expect(send).toMatch(/erKundeHostDestinasjon\(db, tenantId, email\)/);
    expect(send).toMatch(/opprettBrukerForEpost\(db, email\)/);
    expect(send.indexOf('erKundeHostDestinasjon')).toBeLessThan(
      send.indexOf('opprettBrukerForEpost'),
    );
  });

  it('kunde hos annen tenant er avvist — dest og verify', async () => {
    await expect(
      erKundeHostDestinasjon(dbMedKunder([]) as never, 'tenant-bergen', 'kunde@moss.no'),
    ).resolves.toBe(false);
    expect(
      forhandlerVerifyMedlemskap({
        tenantId: 'tenant-bergen',
        harRolle: false,
        kundeId: null,
      }),
    ).toBe('riv');
  });

  it('kunde hos denne tenanten er dest og får sesjon', async () => {
    await expect(
      erKundeHostDestinasjon(
        dbMedKunder([{ id: 'k1' }]) as never,
        'tenant-bergen',
        'ola@bergen.no',
      ),
    ).resolves.toBe(true);
    expect(
      forhandlerVerifyMedlemskap({
        tenantId: 'tenant-bergen',
        harRolle: false,
        kundeId: 'k1',
      }),
    ).toBe('behold');
  });

  it('forhandler-dest faller aldri tilbake til global auth-dest', () => {
    const auth = les('../src/auth.ts');
    const dest = auth.slice(auth.indexOf('const destinasjon'), auth.indexOf('return betterAuth'));
    const forhandler = dest.slice(
      dest.indexOf("sone === 'forhandler'"),
      dest.indexOf('return erAuthDestinasjon'),
    );
    expect(forhandler).toMatch(/if \(!tenantId\) return false/);
    expect(forhandler).toMatch(/erKundeHostDestinasjon\(database, tenantId, email\)/);
    expect(forhandler).not.toMatch(/erAuthDestinasjon/);
    expect(forhandler).not.toMatch(/erForhandlerDestinasjon/);
  });

  it('verify river sesjon uten tenant-medlemskap, også uten tenantId', () => {
    expect(forhandlerVerifyMedlemskap({ tenantId: null, harRolle: false, kundeId: null })).toBe(
      'riv',
    );
    expect(forhandlerVerifyMedlemskap({ tenantId: '', harRolle: true, kundeId: 'k1' })).toBe('riv');
    expect(
      forhandlerVerifyMedlemskap({
        tenantId: 'tenant-bergen',
        harRolle: true,
        kundeId: null,
      }),
    ).toBe('behold');
    const hook = les('../src/magic-link-2fa.ts');
    expect(hook).toMatch(/forhandlerVerifyMedlemskap/);
    expect(hook).toMatch(/opts\?\.sone === 'forhandler'/);
    expect(hook).toMatch(/rivSesjon/);
    expect(hook).toMatch(/\/logg-inn/);
    expect(les('../src/auth.ts')).toMatch(/createAuthEtterHook\(db, \{ sone \}\)/);
  });

  it('slug-oppslag setter app.slug_sjekk under FORCE RLS', () => {
    const konto = les('../src/forhandler-konto.ts');
    expect(konto).toMatch(/set_config\('app\.slug_sjekk'/);
    expect(konto).toMatch(/eq\(schema\.tenants\.slug, s\)/);
  });

  it('0063 rydder feilopprettede kontoer uten medlemskap/kunde', () => {
    const sql = les('../../../packages/db/drizzle/0063_oppstart_branding_kunde.sql');
    expect(sql).toMatch(/DELETE FROM "session"/);
    expect(sql).toMatch(/DELETE FROM "user"/);
    expect(sql).toMatch(/created_at >= TIMESTAMPTZ '2026-11-01'/);
    expect(sql).toMatch(/NOT EXISTS \(SELECT 1 FROM "member"/);
    expect(sql).toMatch(/NOT EXISTS \(SELECT 1 FROM "customers"/);
  });
});
