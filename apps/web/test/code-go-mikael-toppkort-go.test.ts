import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { osloDatoKort, osloUkedagNavn, osloVeggklokke } from '../app/(app)/_lib/oslo-dag.ts';
import {
  dagBuePunkt,
  dagFremgang,
  fmtPulseTime,
  PULSE_DAG_BUE_CX,
  PULSE_DAG_BUE_CY,
  PULSE_DAG_BUE_R,
  PULSE_DAG_FYLL_HAIRLINE,
  PULSE_DAG_FYLL_INK,
  PULSE_DAG_FYLL_SOFT,
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

describe('CODE-GO Mikael — toppkort uten blå nål', () => {
  it('halvsirkel er kun Amicro med blått fyll — ingen klokke, ingen ekstra strek', () => {
    expect(PULSE_DAG_FYLL_INK).toBe('#141414');
    expect(PULSE_DAG_FYLL_HAIRLINE).toBe('#e0e0e0');
    expect(PULSE_DAG_FYLL_SOFT).toBe('#f0f0f0');
    expect(fmtPulseTime(8)).toBe('08.00');
    expect(fmtPulseTime(19)).toBe('19.00');
    const midt = dagFremgang(osloVeggklokke('2026-09-08', 13, 30));
    expect(midt.andel).toBeCloseTo(0.5);
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
    expect(sirkel).toMatch(/data-pulse-dag-dither/);
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_BLA|#0066ff/);
    expect(sirkel).toMatch(/DitherDonutChart/);
    expect(sirkel).not.toMatch(/data-pulse-dag-naa/);
    expect(sirkel).not.toMatch(/strokeDasharray/);
    expect(sirkel).not.toMatch(/<svg|halvBue|strokeWidth/);
    expect(sirkel).toMatch(/data-pulse-dag-start/);
    expect(sirkel).toMatch(/data-pulse-dag-slutt/);
  });

  it('Avvik/Forespørsler er Modus-plate uten ekstra ring, spørsmålstegn', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const boks = funksjon(kort, 'PulseAvvikForesporBoks');
    expect(boks).toMatch(/ew-modus-plate/);
    expect(boks).toMatch(/rounded-full/);
    expect(boks).toMatch(/p-0\.5/);
    expect(boks).toMatch(/size-7|h-7/);
    expect(boks).toMatch(/max-w-\[50%\]/);
    expect(boks).not.toMatch(/w-px/);
    expect(boks).not.toMatch(/ring-1 ring-divide/);
    expect(boks).toMatch(/CircleQuestionMark/);
    expect(boks).toMatch(/TriangleAlert/);
    expect(boks).not.toMatch(/text-danger|text-warn/);
  });

  it('ukedag+dato øverst til venstre i text-label, ikke fet', () => {
    const dag = pulsdagOverskrift(osloVeggklokke('2026-09-08', 10, 0));
    expect(dag.ukedag).toBe(osloUkedagNavn(osloVeggklokke('2026-09-08', 10, 0)));
    expect(dag.dato).toBe(osloDatoKort(osloVeggklokke('2026-09-08', 10, 0)));
    expect(dag.ukedag).toBe('Tirsdag');

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(hero.indexOf('data-pulse-ukedag')).toBeLessThan(hero.indexOf('data-pulse-teller-rad'));
    expect(hero).toMatch(/text-label font-normal/);
    expect(hero).toMatch(/items-center/);
    expect(hero).not.toMatch(/items-end/);
    expect(hero).toMatch(/PulseEndringerLenke/);
  });
});
