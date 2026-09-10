import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { osloDatoKort, osloUkedagNavn, osloVeggklokke } from '../app/(app)/_lib/oslo-dag.ts';
import {
  dagBuePunkt,
  dagFremgang,
  PULSE_DAG_BUE_CX,
  PULSE_DAG_BUE_CY,
  PULSE_DAG_BUE_R,
  PULSE_DAG_FREMGANG_BLA,
  pulsdagOverskrift,
} from '../app/(app)/_shell/phone-home-pulse.ts';

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

describe('CODE-GO Mikael — toppkort GO (blå fill, Modus, tettere dag)', () => {
  it('halvsirkel har synlig blå fill-linje og Oslo-klokke i midten', () => {
    expect(PULSE_DAG_FREMGANG_BLA).toBe('#0066ff');
    const midt = dagFremgang(osloVeggklokke('2026-09-08', 13, 30));
    expect(midt.andel).toBeCloseTo(0.5);
    expect(midt.naaLabel).toBe('13:30');
    const start = dagBuePunkt(0);
    const topp = dagBuePunkt(0.5);
    const slutt = dagBuePunkt(1);
    expect(start.x).toBeCloseTo(PULSE_DAG_BUE_CX - PULSE_DAG_BUE_R);
    expect(start.y).toBeCloseTo(PULSE_DAG_BUE_CY);
    expect(topp.x).toBeCloseTo(PULSE_DAG_BUE_CX);
    expect(topp.y).toBeCloseTo(PULSE_DAG_BUE_CY - PULSE_DAG_BUE_R);
    expect(slutt.x).toBeCloseTo(PULSE_DAG_BUE_CX + PULSE_DAG_BUE_R);
    expect(slutt.y).toBeCloseTo(PULSE_DAG_BUE_CY);

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    expect(sirkel).toMatch(/data-pulse-dag-fyll/);
    expect(sirkel).toMatch(/data-pulse-dag-naa/);
    expect(sirkel).toMatch(/PULSE_DAG_FREMGANG_BLA/);
    expect(sirkel).toMatch(/strokeDasharray/);
    expect(sirkel).toMatch(/setInterval\(tick, 1000\)/);
    expect(sirkel).toMatch(/data-pulse-dag-start/);
    expect(sirkel).toMatch(/data-pulse-dag-slutt/);
  });

  it('Avvik/Forespørsler er Modus-plate med spørsmålstegn, ikke rød/gul', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const boks = funksjon(kort, 'PulseAvvikForesporBoks');
    expect(boks).toMatch(/ew-modus-plate/);
    expect(boks).toMatch(/rounded-full/);
    expect(boks).toMatch(/CircleQuestionMark/);
    expect(boks).toMatch(/TriangleAlert/);
    expect(boks).not.toMatch(/MessageSquare/);
    expect(boks).not.toMatch(/text-danger|text-warn/);
    expect(boks).toMatch(/data-pulse-avvik-felt/);
    expect(boks).toMatch(/data-pulse-forespor-felt/);
  });

  it('dato sitter på samme rad som ukedag; PPF og 08/19 deler bunnlinje', () => {
    const dag = pulsdagOverskrift(osloVeggklokke('2026-09-08', 10, 0));
    expect(dag.ukedag).toBe(osloUkedagNavn(osloVeggklokke('2026-09-08', 10, 0)));
    expect(dag.dato).toBe(osloDatoKort(osloVeggklokke('2026-09-08', 10, 0)));
    expect(dag.dato).toMatch(/^\d{1,2}\. sep$/);
    expect(dag.ukedag).toBe('Tirsdag');

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(hero.indexOf('data-pulse-teller-rad')).toBeLessThan(hero.indexOf('data-pulse-ukedag'));
    expect(hero.indexOf('data-pulse-ukedag')).toBeLessThan(hero.indexOf('data-pulse-dato'));
    expect(hero.indexOf('data-pulse-dato')).toBeLessThan(hero.indexOf('PulseTall'));
    expect(hero).toMatch(/items-end/);
    expect(hero).toMatch(/gap-3/);
    expect(hero).toMatch(/p-4/);
    expect(hero).toMatch(/PulseEndringerLenke/);
  });
});
