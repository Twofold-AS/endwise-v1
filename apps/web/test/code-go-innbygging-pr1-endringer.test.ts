import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { PULSE_ENDRINGER_HREF } from '../app/(app)/_shell/phone-home.ts';
import { parseTimeplanFane } from '../app/(app)/jobber/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function funksjon(kilde: string, navn: string) {
  const start = kilde.indexOf(`export function ${navn}`);
  expect(start).toBeGreaterThan(-1);
  const neste = kilde.slice(start + 1).search(/\nexport function |\nexport const /);
  return neste === -1 ? kilde.slice(start) : kilde.slice(start, start + 1 + neste);
}

/**
 * Innbygging fasit §4 / §7 PR1 — Endringer som stille tekstlenke nederst
 * i I dag-kortet. Chrome (top-bar 1+2, FORHANDLER_NAV, sidebar) urørt.
 */
describe('CODE-GO innbygging PR1 — Endringer-lenke i I dag', () => {
  it('I dag-kortet har Endringer nederst som ink-tekstlenke til /jobber?fane=endringer', () => {
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=endringer');
    expect(parseTimeplanFane('/jobber', 'endringer')).toBe('endringer');

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    const lenke = funksjon(kort, 'PulseEndringerLenke');
    const topp = hero.slice(0, hero.indexOf('data-pulse-teller-rad'));
    const bunn = hero.slice(hero.indexOf('data-pulse-hero-bunn'));

    expect(hero).toMatch(/data-pulse-hero-bunn/);
    expect(bunn).toMatch(/PulseEndringerLenke/);
    expect(hero.indexOf('data-pulse-teller-rad')).toBeLessThan(hero.indexOf('PulseEndringerLenke'));
    expect(topp).not.toMatch(/PulseEndringerLenke/);

    expect(lenke).toMatch(/PULSE_ENDRINGER_HREF/);
    expect(lenke).toMatch(/>Endringer</);
    expect(lenke).toMatch(/text-label/);
    expect(lenke).toMatch(/text-fg/);
    expect(lenke).not.toMatch(/#0066ff/);
    expect(lenke).not.toMatch(/bg-fg|bg-primary|rounded-pill/);

    expect(hero).toMatch(/Planlagt|Starter/);
    expect(hero).toMatch(/Pågår/);
    expect(hero).toMatch(/Ferdig/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
  });

  it('chrome urørt: FORHANDLER_NAV-destinasjoner og top-bar 1+2 uten nye faner', () => {
    expect(FORHANDLER_NAV.map((i) => i.key)).toEqual([
      'home',
      'innboks',
      'saker',
      'kunder',
      'tjenester',
      'organisasjon',
      'lager',
      'butikk',
    ]);
    const timeplan = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(timeplan?.pills?.map((p) => p.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);

    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-top-bar="1"/);
    expect(shell).toMatch(/data-phone-top-bar="2"/);
    expect(shell).toMatch(/data-phone-dest/);
    expect(shell).not.toMatch(/fane=endringer/);
  });
});
