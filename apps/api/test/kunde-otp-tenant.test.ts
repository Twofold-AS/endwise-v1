import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapOnboardingPostgresFeil, oppstartFeilMelding } from '../src/trpc/oppstart-postgres.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-10: beOmKode er nøytral og tenant-bundet', () => {
  it('slår opp kunder på hostTenantId og padder tid', () => {
    const rute = les('../src/trpc/routers/kunde.ts');
    expect(rute).toMatch(/const tenantId = ctx\.hostTenantId/);
    expect(rute).toMatch(/eq\(schema\.customers\.tenantId, tenantId\)/);
    expect(rute).toMatch(/noytralKundeKodePause/);
    expect(rute).toMatch(/KODE_NOYTRAL_MS = 400/);
    expect(rute).toMatch(/return \{ ok: true as const \}/);
    expect(rute).not.toMatch(/ok:\s*false/);
    const send = rute.slice(rute.indexOf('beOmKode:'), rute.indexOf('bekreftGdpr:'));
    expect(send).toMatch(/if \(!tenantId/);
    expect(send).toMatch(/signInMagicLink/);
    expect([...send.matchAll(/noytralKundeKodePause/g)]).toHaveLength(3);
  });

  it('klient går via beOmKode — ikke signIn.magicLink — og viser nøytral tekst', () => {
    const skjema = les('../../../apps/web/app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    expect(skjema).toMatch(/trpc\.kunde\.beOmKode/);
    expect(skjema).toMatch(/Hvis kontoen finnes, får du en kode på e-post\./);
    expect(skjema).toMatch(/setSteg\('kode'\)/);
    expect(skjema).not.toMatch(/signIn\.magicLink/);
  });
});

describe('F41-07: /oppstart viser aldri Failed query', () => {
  it('mapOnboardingPostgresFeil er vennlig', () => {
    const feil = mapOnboardingPostgresFeil(
      new Error(
        'Failed query: insert into "tenant_branding" ("tenant_id") values ($1) on conflict (tenant_id)',
      ),
    );
    expect(feil.message).toBe('Kunne ikke lagre verkstedet. Prøv igjen.');
    expect(feil.message).not.toMatch(/Failed query|tenant_branding|SQLSTATE/);
    expect(
      oppstartFeilMelding(
        new Error('Failed query: insert into "tenant_branding" … params: 901e3c72'),
      ),
    ).toBe('Kunne ikke lagre verkstedet. Prøv igjen.');
  });

  it('0063 har eier-policy på tenant_branding', () => {
    const sql = les('../../../packages/db/drizzle/0063_oppstart_branding_kunde.sql');
    expect(sql).toMatch(/tenant_branding_tenant_insert_owner/);
    expect(sql).toMatch(/tenant_branding_tenant_select_owner/);
    expect(sql).toMatch(/tenant_branding_tenant_update_owner/);
    expect(sql).toMatch(/current_user = \(/);
    expect(les('../../../packages/db/scripts/grants.ts')).toMatch(
      /tenant_branding_tenant_insert_owner/,
    );
  });
});
