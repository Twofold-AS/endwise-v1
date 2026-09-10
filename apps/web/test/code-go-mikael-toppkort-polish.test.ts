import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { osloVeggklokke } from '../app/(app)/_lib/oslo-dag.ts';
import { PARKED_LABEL } from '../app/(app)/_shell/nav.ts';
import {
  PULSE_AVVIK_HREF,
  PULSE_ENDRINGER_HREF,
  PULSE_FORESPORSEL_HREF,
} from '../app/(app)/_shell/phone-home.ts';
import {
  dagFremgang,
  PULSE_DAG_BUE_START,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { VERKSTED_DAG_SLUTT } from '../app/(app)/dashboard/_timeplan-layout.ts';

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

describe('CODE-GO Mikael — toppkort polish 08–19 + bunn-ikoner + Jobb', () => {
  it('dagsvindu på hjem-sirkelen er 08:00–19:00, ikke Timeplan 20', () => {
    expect(PULSE_DAG_START).toBe(8);
    expect(PULSE_DAG_SLUTT).toBe(19);
    expect(PULSE_DAG_SLUTT).not.toBe(VERKSTED_DAG_SLUTT);
    const start = dagFremgang(osloVeggklokke('2026-08-29', 8, 0));
    expect(start.andel).toBe(0);
    expect(start.startLabel).toBe('08:00');
    expect(start.sluttLabel).toBe('19:00');
    expect(dagFremgang(osloVeggklokke('2026-08-29', 13, 30)).andel).toBeCloseTo(0.5);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 19, 0)).andel).toBe(1);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 20, 0)).andel).toBe(1);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 6, 0)).andel).toBe(0);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(funksjon(kort, 'PulseDagSirkel')).toMatch(/PULSE_DAG_START/);
    expect(funksjon(kort, 'PulseDagSirkel')).toMatch(/PULSE_DAG_SLUTT/);
  });

  it('buen starter venstre og går klokkevis mot høyre', () => {
    expect(PULSE_DAG_BUE_START).toBe(Math.PI);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    expect(sirkel).toMatch(/DitherDonutChart/);
    expect(sirkel).toMatch(/startAngle=\{PULSE_DAG_BUE_START\}/);
    expect(sirkel).toMatch(/sweep=\{PULSE_DAG_BUE_SWEEP\}/);
    expect(sirkel).toMatch(/PULSE_DAG_FREMGANG_BLA|#0066ff/);
    expect(sirkel).toMatch(/data-pulse-dag-fyll/);
    expect(sirkel).toMatch(/data-pulse-dag-naa/);
    const donut = les('../../../packages/ui/src/vendor/amicro/dither-donut.tsx');
    expect(donut).toMatch(/startAngle\s*=\s*-Math\.PI \/ 2/);
    expect(donut).toMatch(/let startAngle = startAngleProp/);
  });

  it('halvsirkel sitter på teller-rad; Avvik/Forespørsler-boks + Endringer nederst', () => {
    expect(PULSE_AVVIK_HREF).toBe('/jobber?fane=avvik');
    expect(PULSE_FORESPORSEL_HREF).toBe('/jobber?fane=forespor');
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=endringer');
    expect(PARKED_LABEL['/avvik']).toBe('Avvik');
    expect(PARKED_LABEL['/timeplan/endringer']).toBe('Endringer');
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(hero.indexOf('PulseDagSirkel')).toBeGreaterThan(-1);
    expect(hero.indexOf('PulseDagSirkel')).toBeLessThan(hero.indexOf('data-pulse-hero-bunn'));
    expect(hero).toMatch(/PulseEndringerLenke/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
    expect(hero).toMatch(/data-pulse-teller-rad/);
    expect(hero).toMatch(/data-pulse-del="1"/);
    expect(hero).toMatch(/data-pulse-ukedag/);
    expect(hero).toMatch(/data-pulse-dato/);
    expect(hero).toMatch(/Planlagt/);
    expect(hero).toMatch(/Pågår/);
    expect(hero).toMatch(/Ferdig/);
    expect(kort).toMatch(/TriangleAlert/);
    expect(kort).toMatch(/CircleQuestionMark/);
    expect(kort).toMatch(/ew-modus-plate/);
    expect(kort).not.toMatch(/PulseMockBadge/);
  });

  it('Jobb-raden har etikett til venstre og ikon til høyre', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const jobb = funksjon(kort, 'PulseJobbFlis');
    expect(jobb).toMatch(/data-pulse-jobb/);
    expect(jobb.indexOf('>Jobb<')).toBeGreaterThan(-1);
    expect(jobb.indexOf('>Jobb<')).toBeLessThan(jobb.indexOf('PulseIkonFlate'));
    expect(jobb.indexOf('PulseIkonFlate')).toBeLessThan(jobb.lastIndexOf('Plus'));
  });
});
