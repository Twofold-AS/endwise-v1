import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Organisasjon › Forhandleren', () => {
  it('Ansatte-piller er Team, Prisliste, Kompetanse, Timeplan — ikke Forhandleren', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org?.label).toBe('Ansatte');
    expect(org?.pills?.map((c) => c.label)).toEqual([
      'Team',
      'Prisliste',
      'Kompetanse',
      'Timeplan',
    ]);
  });

  it('siden rendrer firmanavn og adresse, uten kallenavn', () => {
    const side = les('../app/(app)/organisasjon/forhandleren/page.tsx');
    const kort = les('../app/(app)/organisasjon/forhandleren/_kort.tsx');
    expect(side).toMatch(/Forhandleren/);
    expect(kort).toMatch(/Firmanavn/);
    expect(kort).toMatch(/Adresse/);
    expect(kort).toMatch(/Forhandler-epost/);
    expect(kort).toMatch(/forhandler\.update/);
    expect(kort).toMatch(/aria-label="Slug"/);
    expect(kort).toMatch(/readOnly/);
    expect(kort).not.toMatch(/aria-label="Kallenavn"|label="Kallenavn"/);
    expect(kort).not.toMatch(/ToFaktorRad|twoFactorEnabled|setNickname/);
    expect(kort).toMatch(/!Array\.isArray\(data\.leftover\)/);
  });

  it('Forhandleren er ikke en nav-rad', () => {
    expect(FORHANDLER_NAV.some((i) => i.label === 'Forhandleren')).toBe(false);
    expect(breadcrumbFor('/organisasjon/forhandleren', '', 'forhandler')).toEqual([
      { label: 'Forhandleren' },
    ]);
  });
});
