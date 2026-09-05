import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { ORG_LISTE } from '../app/(app)/organisasjon/_org-liste.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Organisasjon › Oversikt (forhandlerkort)', () => {
  it('Organisasjon-liste er Ansatte Timeplan Abonnement Integrasjoner, uten piller', () => {
    expect(ORG_LISTE.map((r) => r.label)).toEqual([
      'Ansatte',
      'Timeplan',
      'Abonnement',
      'Integrasjoner',
    ]);
    const bar = les('../app/(app)/_shell/seksjon-bar.tsx');
    expect(bar).toMatch(/shell === 'forhandler'/);
    expect(bar).toMatch(/return null/);
    expect(bar).not.toMatch(/data-org-piller/);
    const side = les('../app/(app)/organisasjon/page.tsx');
    expect(side).toMatch(/OrganisasjonListe/);
    expect(side).not.toMatch(/data-destinasjon-bar/);
    const liste = les('../app/(app)/organisasjon/_liste.tsx');
    expect(liste).toMatch(/data-org-liste/);
    expect(liste).not.toMatch(/data-destinasjon-bar/);
  });

  it('Organisasjon-nav-piller i nav.ts er uendret bak dest-bar-gaten', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'organisasjon');
    expect(org?.label).toBe('Organisasjon');
    expect(org?.pills?.map((c) => c.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
  });

  it('kortet rendrer firmanavn og adresse, uten kallenavn', () => {
    const side = les('../app/(app)/organisasjon/page.tsx');
    const kort = les('../app/(app)/organisasjon/forhandleren/_kort.tsx');
    expect(side).toMatch(/ForhandlerKort/);
    expect(side).toMatch(/OrganisasjonListe/);
    expect(side).not.toMatch(/PrislisteFlate/);
    expect(kort).toMatch(/Firmanavn/);
    expect(kort).toMatch(/Adresse/);
    expect(kort).toMatch(/Forhandler-epost/);
    expect(kort).toMatch(/forhandler\.update/);
    expect(kort).toMatch(/aria-label="Slug"/);
    expect(kort).toMatch(/readOnly/);
    expect(kort).not.toMatch(/aria-label="Kallenavn"|label="Kallenavn"/);
    expect(kort).not.toMatch(/ToFaktorRad|twoFactorEnabled|setNickname/);
    expect(kort).toMatch(/!Array\.isArray\(vis\.leftover\)/);
  });

  it('Forhandleren er ikke en nav-rad', () => {
    expect(FORHANDLER_NAV.some((i) => i.label === 'Forhandleren')).toBe(false);
    expect(breadcrumbFor('/organisasjon', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Oversikt' },
    ]);
  });
});
