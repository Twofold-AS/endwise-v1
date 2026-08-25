import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Demo-produkt: ny forhandler skal være tom, seed-knapper skal virke eller
 * være ærlige, og brukerflaten skal ikke be om lokal Resend-workaround.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Ny forhandler får ikke auto-demo de ikke kan bruke', () => {
  it('innboksen viser tom tilstand — ikke uklikkbare eksempelsamtaler', () => {
    const sidebar = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(sidebar).not.toMatch(/MOCK_TRADER|brukerMock/);
    expect(sidebar).not.toMatch(/eksempelsamtaler|Eksempelrader/);
    expect(sidebar).toMatch(/Ingen samtaler/);
  });

  it('tenants.create og oppstartsveiviseren seeder ikke demo-data', () => {
    const create = utenKommentarer(les('../../api/src/trpc/routers/tenants.ts'));
    const createBlokk = create.slice(
      create.indexOf('create: endwiseAdminProcedure'),
      create.indexOf('setModules:'),
    );
    expect(createBlokk).not.toMatch(/seedDemo|seedLager|Demo Demosen/);

    const oppstart = utenKommentarer(les('../app/(app)/oppstart/page.tsx'));
    expect(oppstart).not.toMatch(/seedDemo|Seed demo/);

    const forhandlere = utenKommentarer(les('../app/(app)/endwise/forhandlere/page.tsx'));
    expect(forhandlere).not.toMatch(/tenants\.seedDemo|seed\.mutate/);
    expect(forhandlere).toMatch(/Fyller ikke dummy-data/);
  });
});

describe('Seed demo-data-knappen lyver ikke', () => {
  it('innstillinger seeder valgt demo-tenant, ikke bare sesjonens tenant', () => {
    const side = utenKommentarer(les('../app/(app)/endwise/innstillinger/page.tsx'));
    expect(side).toMatch(/seedDemo/);
    expect(side).toMatch(/tenantId/);
    expect(side).toMatch(/kind === ['"]demo['"]/);
    expect(side).not.toMatch(/disabled=\{\s*!status\?\.enabled/);
  });

  it('uten demo-tenant eller uten flagg vises ærlig tekst, ikke en død knapp', () => {
    const side = utenKommentarer(les('../app/(app)/endwise/innstillinger/page.tsx'));
    expect(side).toMatch(/Ingen demo-tenant|Slå på dev-mode-flagget/);
  });
});

describe('Brukerflaten ber ikke om lokal Resend-kopi', () => {
  const sider = [
    '../app/invitasjon/[token]/page.tsx',
    '../app/glemt-passord/page.tsx',
    '../app/2fa-oppsett/page.tsx',
    '../app/signin/signin-skjema.tsx',
    '../app/signin/page.tsx',
    '../app/(app)/oppstart/page.tsx',
  ];

  it.each(sider)('%s nevner ikke lokal api-logg / Resend-workaround', (rel) => {
    const visning = utenKommentarer(les(rel));
    expect(visning).not.toMatch(/Kjører du lokalt/);
    expect(visning).not.toMatch(/uten Resend/);
    expect(visning).not.toMatch(/api-loggen/);
    expect(visning).not.toMatch(/i terminalen/);
  });
});
