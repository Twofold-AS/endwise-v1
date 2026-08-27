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
  it('nav-barn er Forhandleren, Team, Kompetanse, Timeplan', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org?.children?.map((c) => c.label)).toEqual([
      'Forhandleren',
      'Team',
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

  it('breadcrumb er Organisasjon · Forhandleren', () => {
    expect(breadcrumbFor('/organisasjon/forhandleren', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon/forhandleren' },
      { label: 'Forhandleren' },
    ]);
  });
});
