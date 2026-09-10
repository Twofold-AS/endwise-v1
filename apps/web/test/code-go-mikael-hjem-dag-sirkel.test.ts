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

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('CODE-GO Mikael — hjem toppkort dag-sirkel', () => {
  it('dagvindu på hjem-sirkelen er 08–19 Oslo, Timeplan-rutenett er 08–20', () => {
    expect(PULSE_DAG_START).toBe(8);
    expect(PULSE_DAG_SLUTT).toBe(19);
    expect(VERKSTED_DAG_START).toBe(8);
    expect(VERKSTED_DAG_SLUTT).toBe(20);
    expect(PULSE_DAG_SLUTT).not.toBe(VERKSTED_DAG_SLUTT);
    const start = dagFremgang(osloVeggklokke('2026-08-29', 8, 0));
    expect(start.andel).toBe(0);
    expect(start.startLabel).toBe('08:00');
    expect(start.sluttLabel).toBe('19:00');
    expect(dagFremgang(osloVeggklokke('2026-08-29', 13, 30)).andel).toBeCloseTo(0.5);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 19, 0)).andel).toBe(1);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 6, 0)).andel).toBe(0);
    expect(dagFremgang(osloVeggklokke('2026-08-29', 22, 0)).andel).toBe(1);
  });

  it('Avvik og Forespørsler er visningstall; Endringer peker på Timeplan', () => {
    expect(PULSE_AVVIK_HREF).toBe('/jobber?fane=avvik');
    expect(PULSE_FORESPORSEL_HREF).toBe('/jobber?fane=forespor');
    expect(PARKED_LABEL['/avvik']).toBe('Avvik');
    expect(PARKED_LABEL['/timeplan/endringer']).toBe('Endringer');
    expect(les('../app/(app)/avvik/page.tsx')).toMatch(/jobber\?fane=avvik/);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(kort).toMatch(/PulseEndringerLenke/);
    expect(kort).toMatch(/PulseAvvikForesporBoks/);
    expect(kort).not.toMatch(/PulseValgLenke/);
    expect(kort).toMatch(/TriangleAlert/);
    expect(kort).toMatch(/data-pulse-hero-bunn/);
  });

  it('toppkort er to-delt med dither-donut; Analyser ligger sist', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    expect(DEALER_PHONE_HJEM.at(-1)?.keys).toEqual(['team', 'jobb']);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const preview = utenKommentarer(les('../app/pulse-preview/page.tsx'));
    expect(hjem).toMatch(/PulseHeroFlate/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).not.toMatch(/PulseUkeSpark|Pulse30dSpark/);
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeLessThan(hjem.lastIndexOf('PulseJobbFlis'));
    expect(kort).toMatch(/#141414/);
    expect(kort).toMatch(/#ffffff/);
    expect(kort).toMatch(/data-pulse-dag-sirkel/);
    expect(kort).toMatch(/DitherDonutChart/);
    expect(preview).toMatch(/PulseHeroFlate/);
    expect(preview.lastIndexOf('PulseAnalyserKort')).toBeLessThan(
      preview.lastIndexOf('PulseJobbFlis'),
    );
  });
});
