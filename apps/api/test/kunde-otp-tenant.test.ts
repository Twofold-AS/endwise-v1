import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sanitiserTrpcMelding } from '../src/trpc/init.ts';
import { mapOnboardingPostgresFeil, oppstartFeilMelding } from '../src/trpc/oppstart-postgres.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-10: beOmKode er tenant-bundet og ærlig ved ukjent kunde', () => {
  it('slår opp kunder på hostTenantId, sender bare ved treff, padder tid', () => {
    const rute = les('../src/trpc/routers/kunde.ts');
    expect(rute).toMatch(/const tenantId = ctx\.hostTenantId/);
    expect(rute).toMatch(/eq\(schema\.customers\.tenantId, tenantId\)/);
    expect(rute).toMatch(/noytralKundeKodePause/);
    expect(rute).toMatch(/KODE_NOYTRAL_MS = 400/);
    const send = rute.slice(rute.indexOf('beOmKode:'), rute.indexOf('bekreftGdpr:'));
    expect(send).toMatch(/avgjorBeOmKode/);
    expect(send).toMatch(/beOmKodeSvar/);
    expect(send).toMatch(/handling !== 'send'/);
    expect(send).toMatch(/sendt: true/);
    expect(send).toMatch(/grunn: 'feil'/);
    expect(send).toMatch(/signInMagicLink/);
    expect(send).not.toMatch(/opprettBrukerForEpost/);
    expect(send).not.toMatch(/ok:\s*true/);
    expect(send).toMatch(/finally/);
    expect([...send.matchAll(/noytralKundeKodePause/g)]).toHaveLength(1);
  });

  it('klient går via beOmKode — ikke signIn.magicLink — og viser ærlig ukjent-kunde', () => {
    const skjema = les('../../../apps/web/app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    expect(skjema).toMatch(/trpc\.kunde\.beOmKode/);
    expect(skjema).toMatch(/kundeKodeFeilMelding/);
    expect(skjema).toMatch(/@endwise\/modules\/kunde\/logg-inn-kode/);
    expect(skjema).toMatch(/KUNDE_KODE_SENDT/);
    expect(skjema).toMatch(/FeilFlate/);
    expect(skjema).toMatch(/if \(svar\.sendt\)/);
    expect(skjema).toMatch(/setSteg\('kode'\)/);
    expect(skjema).not.toMatch(/Hvis kontoen finnes/);
    expect(skjema).not.toMatch(/signIn\.magicLink/);
    const ident = skjema.slice(
      skjema.indexOf('async function onIdent'),
      skjema.indexOf('async function onKode'),
    );
    expect(ident).toMatch(/if \(svar\.sendt\)/);
    expect(ident).toMatch(/setSteg\('kode'\)/);
    expect(ident).toMatch(/kundeKodeFeilMelding/);
    expect(ident).not.toMatch(/catch \{[\s\S]*setSteg\('kode'\)/);
  });
});

describe('F41-07: tRPC lekker ikke Failed query', () => {
  it('sanitiserTrpcMelding fanger Drizzle-skall uten delvis forankret regex', () => {
    expect(sanitiserTrpcMelding('Failed query: insert into "tenant_branding"')).toBe(
      'Noe gikk galt. Prøv igjen.',
    );
    expect(sanitiserTrpcMelding('noe params: :abc')).toBe('Noe gikk galt. Prøv igjen.');
    expect(sanitiserTrpcMelding('SQLSTATE 42501')).toBe('Noe gikk galt. Prøv igjen.');
    expect(sanitiserTrpcMelding('Kunne ikke lagre verkstedet. Prøv igjen.')).toBeNull();
    const init = les('../src/trpc/init.ts');
    expect(init).toMatch(/startsWith\('Failed query:'\)/);
    expect(init).not.toMatch(/\^Failed query:/);
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
