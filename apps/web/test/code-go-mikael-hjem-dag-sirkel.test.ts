import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { osloVeggklokke } from '../app/(app)/_lib/oslo-dag.ts';
import { PARKED_LABEL } from '../app/(app)/_shell/nav.ts';
import {
  DEALER_PHONE_HJEM,
  DEALER_PULSE_KEYS,
  PULSE_AVVIK_HREF,
  PULSE_FORESPORSEL_HREF,
} from '../app/(app)/_shell/phone-home.ts';
import {
  dagFremgang,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { VERKSTED_DAG_SLUTT, VERKSTED_DAG_START } from '../app/(app)/dashboard/_timeplan-layout.ts';
import { hjelpHref } from '../app/(app)/hjelp/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('CODE-GO Mikael — hjem toppkort dag-sirkel', () => {
  it('dagvindu er Timeplan 08–20 Oslo, ikke per-forhandler åpningstid', () => {
    expect(PULSE_DAG_START).toBe(VERKSTED_DAG_START);
    expect(PULSE_DAG_SLUTT).toBe(VERKSTED_DAG_SLUTT);
    expect(PULSE_DAG_START).toBe(8);
    expect(PULSE_DAG_SLUTT).toBe(20);
    const start = dagFremgang(osloVeggklokke('2026-08-29', 8, 0));
    expect(start.andel).toBe(0);
    expect(start.startLabel).toBe('08:00');
    expect(start.sluttLabel).toBe('20:00');
    expect(dagFremgang(osloVeggklokke('2026-08-29', 14, 0)).andel).toBeCloseTo(0.5);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 20, 0)).andel).toBe(1);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 6, 0)).andel).toBe(0);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 22, 0)).andel).toBe(1);
  });

  it('Avvik er stub /avvik, Forespørsel er Hjelp › Forespørsler', () => {
    expect(PULSE_AVVIK_HREF).toBe('/avvik');
    expect(PULSE_FORESPORSEL_HREF).toBe(hjelpHref('forespor'));
    expect(PARKED_LABEL['/avvik']).toBe('Avvik');
    expect(les('../app/(app)/avvik/page.tsx')).toMatch(/data-avvik-stub/);
    expect(les('../app/(app)/avvik/page.tsx')).toMatch(/F7-05/);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(kort).toMatch(/PulseHeroIkoner/);
    expect(kort).toMatch(/data-pulse-hero-ikoner/);
    expect(kort).toMatch(/TriangleAlert/);
    expect(kort).toMatch(/MessageSquare/);
    expect(kort).toMatch(/PULSE_AVVIK_HREF/);
    expect(kort).toMatch(/PULSE_FORESPORSEL_HREF/);
  });

  it('toppkort bytter dither mot ink-sirkel; Analyser ligger sist', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'team',
      'jobb',
      'analyser',
    ]);
    expect(DEALER_PHONE_HJEM.at(-1)?.keys).toEqual(['analyser']);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const preview = utenKommentarer(les('../app/pulse-preview/page.tsx'));
    expect(hjem).toMatch(/PulseDagSirkel/);
    expect(hjem).toMatch(/PulseHeroIkoner/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).not.toMatch(/PulseUkeSpark|Pulse30dSpark/);
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeGreaterThan(
      hjem.lastIndexOf('PulseJobbFlis'),
    );
    expect(kort).toMatch(/#141414/);
    expect(kort).toMatch(/#ffffff/);
    expect(kort).toMatch(/data-pulse-dag-sirkel/);
    expect(kort).not.toMatch(/DitherDonutChart/);
    expect(preview).toMatch(/PulseDagSirkel/);
    expect(preview).toMatch(/PulseHeroIkoner/);
    expect(preview.lastIndexOf('PulseAnalyserKort')).toBeGreaterThan(
      preview.lastIndexOf('PulseJobbFlis'),
    );
  });
});
