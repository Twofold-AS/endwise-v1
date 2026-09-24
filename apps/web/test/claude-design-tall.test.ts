import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEALER_PHONE_HJEM,
  DEALER_PULSE_KEYS,
  PHONE_KORT_META,
} from '../app/(app)/_shell/phone-home.ts';
import {
  idagVisning,
  innboksRad,
  siste7dSpark,
  tallCeller,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { jobSlots, openingHours } from '../app/(app)/bookinger/_job-slots.ts';
import { forbokstav, NORSK_ALPHA } from '../app/(app)/_shell/claude-tokens.ts';

const her = dirname(fileURLToPath(import.meta.url));
function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}
function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design — Tall og pulse-stack', () => {
  it('låser I dag · Innboks · Deler · Svarhastighet · Gulv · Team · Tall', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'deler',
      'svarhastighet',
      'timeplan',
      'team',
      'tall',
    ]);
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual([
      ['idag'],
      ['innboks'],
      ['deler'],
      ['svarhastighet'],
      ['timeplan'],
      ['team'],
      ['tall'],
    ]);
    expect(PHONE_KORT_META.tall.label).toBe('Tall');
    expect(PHONE_KORT_META.analyser.label).toBe('Tall');
  });

  it('hjem bruker PulseTallKort, ikke Analyse/Se tallene', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(hjem).toMatch(/PulseTallKort/);
    expect(hjem).toMatch(/PulseGulvKort/);
    expect(hjem).toMatch(/PulseSvarKort/);
    expect(hjem).toMatch(/PulseTeamKort/);
    expect(hjem).toMatch(/PulseFooter/);
    expect(hjem).not.toMatch(/PulseAnalyserKort/);
    expect(kort).toMatch(/data-pulse-tall/);
    expect(kort).toMatch(/data-tall-tittel/);
    expect(kort).toMatch(/siste 30 dager/);
    expect(kort).toMatch(/Alle tall/);
    expect(kort).toMatch(/Visninger/);
    expect(kort).toMatch(/Bookinger/);
    expect(kort).toMatch(/Returer/);
    expect(kort).not.toMatch(/Se tallene/);
    expect(kort).not.toMatch(/PulseAnalyserKort/);
    expect(funksjon(kort, 'PulseTallKort')).not.toMatch(/#0066ff/);
  });

  it('Tall-celler er ærlige: visninger/returer stub, bookinger live', () => {
    const naa = new Date('2026-09-08T10:00:00Z');
    const celler = tallCeller(
      [
        { id: '1', status: 'confirmed', startsAt: '2026-09-01T08:00:00Z' },
        { id: '2', status: 'completed', startsAt: '2026-08-01T08:00:00Z' },
      ],
      naa,
    );
    expect(celler.find((c) => c.id === 'visninger')?.stub).toMatch(/Ikke tilkoblet/);
    expect(celler.find((c) => c.id === 'returer')?.stub).toMatch(/retur/i);
    expect(celler.find((c) => c.id === 'bookinger')?.verdi).toBe(1);
    expect(celler.some((c) => c.id === 'credits')).toBe(false);
  });

  it('I dag og innboks er ærlig null, spark er fullført 7d', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(idagVisning([], naa)).toEqual({ planlagt: 0, paagaar: 0, ferdig: 0 });
    expect(innboksRad([])).toEqual({ meldinger: 0, slaMs: null });
    expect(siste7dSpark([], naa)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(
      siste7dSpark(
        [
          { id: '1', status: 'completed', startsAt: '2026-08-25T08:00:00' },
          { id: '2', status: 'confirmed', startsAt: '2026-08-25T09:00:00' },
        ],
        naa,
      ).reduce((a, b) => a + b, 0),
    ).toBe(1);
  });

  it('jobSlots stenger søndag, lør 10–15, 30 min, overlap og kval', () => {
    expect(openingHours('2026-09-06')).toBeNull();
    expect(openingHours('2026-09-05')).toEqual([10 * 60, 15 * 60]);
    const slots = jobSlots({
      ymd: '2026-09-07',
      durationMin: 60,
      requiredQuals: ['eu'],
      mekanikere: [
        { id: 'a', name: 'Kari', role: 'mekaniker', onDuty: true, quals: ['eu'] },
        { id: 'b', name: 'Ola', role: 'mekaniker', onDuty: true, quals: [] },
      ],
      jobber: [
        {
          mechanicId: 'a',
          startsAt: '2026-09-07T08:00:00+02:00',
          endsAt: '2026-09-07T09:00:00+02:00',
          status: 'confirmed',
        },
      ],
    });
    expect(slots[0]?.t).toBeGreaterThanOrEqual(9 * 60);
    expect(slots.every((s) => s.mechanicIds.includes('a'))).toBe(true);
    expect(slots.every((s) => !s.mechanicIds.includes('b'))).toBe(true);
  });

  it('kunder har høyre alpha-rail, innboks pager/angre, meld endring', () => {
    expect(NORSK_ALPHA).toContain('Å');
    expect(forbokstav('Åse')).toBe('Å');
    expect(les('../app/(app)/kunder/_liste.tsx')).toMatch(/ClaudeAlphaRail/);
    expect(les('../app/(app)/kunder/_liste.tsx')).toMatch(/absolute/);
    expect(les('../app/(app)/innboks/_inbox-sidebar.tsx')).toMatch(/ClaudePager/);
    expect(les('../app/(app)/innboks/_inbox-sidebar.tsx')).toMatch(/ClaudeUndoToast/);
    expect(les('../app/(app)/bookinger/_meld-endring.tsx')).toMatch(/reportChange/);
    expect(les('../app/(app)/bookinger/[id]/page.tsx')).toMatch(/MeldEndring/);
    expect(les('../app/(app)/analyse/page.tsx')).toMatch(/PulseTallKort/);
    expect(les('../app/(app)/analyse/page.tsx')).not.toMatch(/DitherStackedChart|Se tallene/);
  });
});

function funksjon(kilde: string, navn: string) {
  const start = kilde.indexOf(`export function ${navn}`);
  expect(start).toBeGreaterThan(-1);
  const neste = kilde.slice(start + 1).search(/\nexport function |\nexport const /);
  return neste === -1 ? kilde.slice(start) : kilde.slice(start, start + 1 + neste);
}
