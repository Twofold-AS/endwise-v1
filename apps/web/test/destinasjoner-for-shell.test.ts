import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  destinasjonerForShell,
  FORHANDLER_NAV,
  itemsForRole,
  rolleForNav,
} from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const DEALER_IA = [
  'Verkstedet',
  'Innboks',
  'Timeplan',
  'Kunder',
  'Tjenester',
  'Organisasjon',
  'Lager',
] as const;

describe('destinasjonerForShell — delt chrome-nav (F5-13 dest-bug)', () => {
  it('itemsForRole er fortsatt tom uten rolle — primitiven er ærlig', () => {
    expect(itemsForRole(FORHANDLER_NAV, null)).toEqual([]);
  });

  it('dealer-IA vises for dealer_admin og dealer_staff, uten Butikk når shop er av', () => {
    const admin = destinasjonerForShell({
      shell: 'forhandler',
      role: 'dealer_admin',
      shopEnabled: false,
    }).map((i) => i.label);
    const staff = destinasjonerForShell({
      shell: 'forhandler',
      role: 'dealer_staff',
      shopEnabled: false,
    }).map((i) => i.label);
    expect(admin).toEqual([...DEALER_IA]);
    expect(staff).toEqual([...DEALER_IA]);
    expect(admin).not.toContain('Butikk');
  });

  it('chrome-first: null-rolle i forhandler-skall gir likevel IA-destinasjoner', () => {
    const dest = destinasjonerForShell({
      shell: 'forhandler',
      role: null,
      shopEnabled: false,
    }).map((i) => i.label);
    expect(dest).toEqual([...DEALER_IA]);
  });

  it('Better-Auth-alias owner/admin normaliseres til dealer_admin — navet forsvinner ikke', () => {
    expect(rolleForNav({ role: 'owner', shell: 'forhandler' })).toBe('dealer_admin');
    expect(rolleForNav({ role: 'admin', shell: 'forhandler' })).toBe('dealer_admin');
    expect(
      destinasjonerForShell({
        shell: 'forhandler',
        role: 'owner',
        shopEnabled: false,
      }).map((i) => i.label),
    ).toEqual([...DEALER_IA]);
  });

  it('plattform-remap og inspect bruker forhandler-IA, ikke tom liste', () => {
    expect(
      destinasjonerForShell({
        shell: 'endwise',
        role: null,
        erPlattform: true,
        shopEnabled: false,
      }).map((i) => i.label),
    ).toEqual(['Oversikt', 'Innboks', 'Forhandlere', 'Team', 'Hjelpeartikler', 'Flagg']);
    expect(
      destinasjonerForShell({
        shell: 'endwise',
        role: 'endwise_admin',
        inspect: true,
        shopEnabled: false,
      }).map((i) => i.label),
    ).toEqual([...DEALER_IA]);
    expect(
      destinasjonerForShell({
        shell: 'endwise',
        role: 'dealer_admin',
        erPlattform: true,
        shopEnabled: false,
      }).map((i) => i.label),
    ).toEqual(['Oversikt', 'Innboks', 'Forhandlere', 'Team', 'Hjelpeartikler', 'Flagg']);
  });

  it('PhoneShell og Sidebar deler destinasjonerForShell — ikke rå itemsForRole(role)', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(shell).toMatch(/destinasjonerForShell/);
    expect(sidebar).toMatch(/destinasjonerForShell/);
    expect(shell).not.toMatch(/itemsForRole\(navForShell/);
    expect(sidebar).not.toMatch(/itemsForRole\(navForShell/);
    expect(sidebar).not.toMatch(/Ingen destinasjoner å vise/);
  });
});
