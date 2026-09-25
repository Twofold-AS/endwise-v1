import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import {
  endringerTeller,
  foresporTeller,
  harAvvikNotat,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { timeplanSkiftUke, timeplanUkeFra } from '../app/(app)/_shell/timeplan-dager.ts';
import { ENDRINGER_DELER, endringerHref, TIMEPLAN_FANER } from '../app/(app)/jobber/_faner.ts';
import { DAGSLISTE_SORTER, sorterDagsliste } from '../app/(app)/jobber/_sorter.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design BIT 3 — Timeplan / Endringer', () => {
  it('Timeplan-chrome er urørt (Timeplan · Opprett jobb · Endringer)', () => {
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    expect(FORHANDLER_NAV.find((i) => i.key === 'saker')?.pills?.map((p) => p.label)).toEqual([
      'Timeplan',
      'Opprett jobb',
      'Endringer',
    ]);
    expect(ENDRINGER_DELER.map((d) => d.id)).toEqual(['avvik', 'forespor']);
    expect(endringerHref('logg')).toBe('/jobber?fane=logg');
  });

  it('uke-rail er mandag–søndag + månedspicker', () => {
    const uke = timeplanUkeFra('2026-09-11');
    expect(uke).toHaveLength(7);
    expect(uke[0]?.ymd).toBe('2026-09-07');
    expect(uke[6]?.ymd).toBe('2026-09-13');
    expect(timeplanSkiftUke('2026-09-11', 1)).toBe('2026-09-18');
    const stripe = utenKommentarer(les('../app/(app)/_shell/timeplan-stripe.tsx'));
    expect(stripe).toMatch(/timeplanUkeFra/);
    expect(stripe).toMatch(/data-timeplan-maned/);
    expect(stripe).toMatch(/Lukk måned/);
    expect(stripe).toMatch(/Forrige uke/);
    expect(stripe).not.toMatch(/overflow-x/);
    expect(stripe).not.toMatch(/setStubGodkjent/);
  });

  it('dagsliste sorterer tid/kunde/status/mekaniker på eksisterende felt', () => {
    expect([...DAGSLISTE_SORTER]).toEqual(['tid', 'kunde', 'status', 'mekaniker']);
    const rader = sorterDagsliste(
      [
        {
          id: 'b',
          startsAt: '2026-09-11T10:00:00',
          customerName: 'Zoe',
          status: 'confirmed',
          mechanicName: 'Ola',
        },
        {
          id: 'a',
          startsAt: '2026-09-11T08:00:00',
          customerName: 'Anne',
          status: 'in_progress',
          mechanicName: 'Kari',
        },
      ],
      'kunde',
    );
    expect(rader.map((r) => r.id)).toEqual(['a', 'b']);
    const side = utenKommentarer(les('../app/(app)/saker/page.tsx'));
    expect(side).toMatch(/TimeplanDagsliste/);
    expect(side).toMatch(/TimeplanFlate/);
    expect(side).toMatch(/Kalender/);
  });

  it('Godkjenn/Avslå kaller bookings.resolveChange, ikke lokal stub', () => {
    const detalj = utenKommentarer(les('../app/(app)/jobber/_endring-detalj.tsx'));
    const avvik = utenKommentarer(les('../app/(app)/jobber/_avvik.tsx'));
    expect(detalj).toMatch(/bookings\.resolveChange/);
    expect(detalj).toMatch(/data-endringer-godkjenn/);
    expect(detalj).toMatch(/data-endringer-avsla/);
    expect(detalj).toMatch(/decision: 'godkjent'/);
    expect(detalj).toMatch(/decision: 'avslatt'/);
    expect(avvik).not.toMatch(/setStubGodkjent|stubGodkjent/);
    expect(avvik).toMatch(/resolveChange|TimeplanEndringDetalj/);
    expect(endringerHref('avvik', 'abc')).toBe('/jobber?fane=avvik&endring=abc');
  });

  it('behandlet avvik faller ut av ventende-telleren', () => {
    expect(harAvvikNotat('[AVVIK 12] sen')).toBe(true);
    expect(harAvvikNotat('[AVVIK-BEHANDLET godkjent 24.09] sen')).toBe(false);
    expect(
      endringerTeller([
        { id: '1', status: 'confirmed', startsAt: '2026-09-08T08:00:00', notes: '[AVVIK 12] sen' },
        {
          id: '2',
          status: 'confirmed',
          startsAt: '2026-09-08T09:00:00',
          notes: '[AVVIK-BEHANDLET godkjent] sen',
        },
      ]),
    ).toBe(1);
    expect(
      foresporTeller([
        {
          id: '3',
          status: 'confirmed',
          startsAt: '2026-09-08T10:00:00',
          notes: '[FORESPOR 12] 30 min',
        },
      ]),
    ).toBe(1);
  });

  it('jobbdetalj har meld-skjema mot reportChange; kalender er urørt', () => {
    const jobb = utenKommentarer(les('../app/(app)/bookinger/[id]/page.tsx'));
    const kalender = utenKommentarer(les('../app/(app)/saker/_kalender.tsx'));
    const meld = utenKommentarer(les('../app/(app)/bookinger/_meld-endring.tsx'));
    expect(jobb).toMatch(/MeldEndringSkjema/);
    expect(jobb).toMatch(/bookings\.transition|ALLOWED_TRANSITIONS/);
    expect(meld).toMatch(/bookings\.reportChange/);
    expect(meld).toMatch(/Meld avvik eller forespørsel/);
    expect(kalender).toMatch(/bookings\.calendar/);
    expect(kalender).not.toMatch(/resolveChange|reportChange/);
  });
});
