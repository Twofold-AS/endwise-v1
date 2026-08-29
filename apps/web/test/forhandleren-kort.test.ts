import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Organisasjon › Oversikt (forhandlerkort)', () => {
  it('Organisasjon-piller er Oversikt Ansatte Abonnement Integrasjoner', () => {
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
