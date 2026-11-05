import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fmtPulseTime, PULSE_DAG_FYLL_BLA } from '../app/(app)/_shell/phone-home-pulse.ts';

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

describe('CODE-GO Mikael — hjem-fiks etter #168', () => {
  it('Avvik og Forespørsler er én segmentert boks med skille (Claude-designet)', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const avvik = funksjon(kort, 'PulseAvvikForesporBoks');
    expect(avvik).toMatch(/rounded-\[13px\] border/);
    expect(avvik).toMatch(/border-divide/);
    expect(avvik).toMatch(/border-border/);
    expect(avvik).toMatch(/data-pulse-avvik-felt/);
    expect(avvik).toMatch(/data-pulse-forespor-felt/);
    expect(avvik).toMatch(/TriangleAlert/);
    expect(avvik).toMatch(/CircleQuestionMark/);
    expect(avvik).toMatch(/w-px/);
    expect(avvik).toMatch(/text-danger/);
    expect(avvik).toMatch(/text-warn/);
    expect(avvik).not.toMatch(/#0066ff/);
  });

  it('PPF-etiketter sitter på samme linje som 08.00/19.00', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(hero.indexOf('data-pulse-ukedag')).toBeLessThan(hero.indexOf('data-pulse-teller-rad'));
    expect(hero.indexOf('data-pulse-teller-rad')).toBeLessThan(
      hero.indexOf('data-pulse-hero-bunn'),
    );
    expect(hero).toMatch(/items-end/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
    expect(hero).toMatch(/PulseEndringerKnapp/);
  });

  it('dagsbuen er kun Amicro-halvsirkel med blått fyll og 08.00/19.00', () => {
    expect(PULSE_DAG_FYLL_BLA).toBe('#0066ff');
    expect(fmtPulseTime(8)).toBe('08.00');
    expect(fmtPulseTime(19)).toBe('19.00');
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    expect(sirkel).toMatch(/DitherDonutChart/);
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_INK/);
    expect(sirkel).toMatch(/sweep=\{PULSE_DAG_BUE_SWEEP\}/);
    expect(sirkel).toMatch(/data-pulse-dag-start/);
    expect(sirkel).toMatch(/data-pulse-dag-slutt/);
    expect(sirkel).not.toMatch(/<svg/);
    expect(sirkel).not.toMatch(/halvBue/);
    expect(sirkel).not.toMatch(/strokeWidth/);
    expect(sirkel).not.toMatch(/data-pulse-dag-naa/);
    const hook = utenKommentarer(les('../../../packages/ui/src/vendor/amicro/use-canvas-setup.ts'));
    expect(hook).toMatch(/getBoundingClientRect/);
    expect(hook).toMatch(/syncCanvasSize/);
    expect(hook).toMatch(/useLayoutEffect/);
    const donut = utenKommentarer(les('../../../packages/ui/src/vendor/amicro/dither-donut.tsx'));
    expect(donut).toMatch(/syncCanvasSize/);
  });

  it('Analyser er én boks uten dither', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const analyser = funksjon(kort, 'PulseAnalyserKort');
    expect(analyser).toMatch(/Analyse/);
    expect(analyser).toMatch(/siste 30 dager/);
    expect(analyser).toMatch(/Alle tall/);
    expect(analyser).not.toMatch(/RevenueLineChart/);
    expect(analyser).not.toMatch(/DitherGrowthChart/);
    expect(analyser).not.toMatch(/scale-\[1\.65\]/);
    expect(analyser).not.toMatch(/#0066ff/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem.indexOf('PulseHeroFlate')).toBeGreaterThan(-1);
    expect(hjem.indexOf('På Jobb')).toBeGreaterThan(-1);
  });
});
