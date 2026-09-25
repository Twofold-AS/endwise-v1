import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEALER_PULSE_KEYS, FORBUDT_DEALER_HJEM } from '../app/(app)/_shell/phone-home.ts';
import {
  bookingerSiste30d,
  TALL_KPI_IDS,
  TALL_STUB_INGEN_API,
  tallKortStats,
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

describe('Claude Design BIT 1 — Verkstedet / hjem Tall-kort', () => {
  it('låst hjem-stabel er uendret: I dag · Innboks · Lager · Tall · På jobb + Jobb', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/PulseHeroFlate/);
    expect(hjem).toMatch(/Les alle siste meldinger/);
    expect(hjem).toMatch(/PHONE_KORT_META\.lager/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).toMatch(/tallKortStats/);
    expect(hjem).toMatch(/På jobb/);
    expect(hjem).toMatch(/PulseJobbFlis/);
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeLessThan(hjem.lastIndexOf('PulseJobbFlis'));
    expect(hjem).not.toMatch(/Svarhastighet|Timeplan-gulv|PulseFooter|PeopleShowcase/);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(hjem).not.toMatch(new RegExp(`['"]${forbudt}['"]`));
    }
  });

  it('PulseAnalyserKort er Tall 2×2 med Alle tall — ikke Claude-chrome', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const analyser = funksjon(kort, 'PulseAnalyserKort');
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(analyser).toMatch(/data-tall-kort/);
    expect(analyser).toMatch(/data-analyser-tittel[\s\S]*\n\s*Tall\s*\n/);
    expect(analyser).toMatch(/siste 30 dager/);
    expect(analyser).toMatch(/Alle tall/);
    expect(analyser).toMatch(/data-analyser-kpi-rutenett/);
    expect(analyser).toMatch(/grid-cols-2/);
    expect(analyser).toMatch(/PulseIkonFlate/);
    expect(analyser).not.toMatch(/RevenueLineChart/);
    expect(analyser).not.toMatch(/DitherGrowthChart/);
    expect(analyser).not.toMatch(/DitherDonutChart/);
    expect(analyser).not.toMatch(/#0066ff/);
    expect(hero).toMatch(/Planlagt/);
    expect(hero).toMatch(/Pågår/);
    expect(hero).toMatch(/Ferdig/);
    expect(hero).toMatch(/PulseDagSirkel/);
    expect(hero).toMatch(/PulseEndringerLenke/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
  });

  it('tallKortStats: live bookinger 30d, ærlige stubber ellers', () => {
    expect([...TALL_KPI_IDS]).toEqual(['visninger', 'bookinger', 'returer', 'credits']);
    const naa = new Date('2026-09-08T10:00:00');
    expect(
      bookingerSiste30d(
        [
          { id: '1', status: 'confirmed', startsAt: '2026-09-01T08:00:00' },
          { id: '2', status: 'completed', startsAt: '2026-08-20T08:00:00' },
          { id: '3', status: 'cancelled', startsAt: '2026-09-02T08:00:00' },
          { id: '4', status: 'confirmed', startsAt: '2026-07-01T08:00:00' },
        ],
        naa,
      ),
    ).toBe(2);
    const stats = tallKortStats(
      [
        { id: '1', status: 'confirmed', startsAt: '2026-09-01T08:00:00' },
        { id: '2', status: 'completed', startsAt: '2026-08-20T08:00:00' },
      ],
      naa,
    );
    expect(stats.map((s) => s.id)).toEqual([...TALL_KPI_IDS]);
    expect(stats.find((s) => s.id === 'bookinger')?.verdi).toBe(2);
    expect(stats.find((s) => s.id === 'bookinger')?.stub).toBeUndefined();
    expect(stats.find((s) => s.id === 'visninger')?.stub).toBe(TALL_STUB_INGEN_API);
    expect(stats.find((s) => s.id === 'returer')?.stub).toBe(TALL_STUB_INGEN_API);
    expect(stats.find((s) => s.id === 'credits')?.stub).toBe(TALL_STUB_INGEN_API);
    expect(stats.find((s) => s.id === 'visninger')?.verdi).toBe('—');
  });

  it('Analyse-dypflater og chrome er urørt', () => {
    const analyse = les('../app/(app)/analyse/page.tsx');
    const analyseKort = les('../app/(app)/analyse/_kort.tsx');
    expect(analyse).toMatch(/AnalyseKort/);
    expect(analyse).toMatch(/DitherStackedChart/);
    expect(analyse).toMatch(/DitherGrowthChart/);
    expect(analyse).toMatch(/RevenueLineChart/);
    expect(analyse).toMatch(/DitherDonutChart/);
    expect(analyseKort).toMatch(/export function AnalyseKort/);
    expect(les('../app/(app)/rapporter/page.tsx')).toMatch(/from '\.\.\/analyse\/page'/);
    const nav = utenKommentarer(les('../app/(app)/_shell/nav.ts'));
    expect(nav).toMatch(/export const FORHANDLER_NAV/);
    expect(nav).not.toMatch(/label: 'Tjenester',\s*href: '\/tjenester'/);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-top-bar="1"/);
    expect(shell).toMatch(/data-phone-top-bar="2"/);
  });
});
