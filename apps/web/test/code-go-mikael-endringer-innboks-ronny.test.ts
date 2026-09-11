import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PARKED_LABEL } from '../app/(app)/_shell/nav.ts';
import { PULSE_ENDRINGER_HREF } from '../app/(app)/_shell/phone-home.ts';
import {
  AVVIK_NOTAT_PREFIKS,
  endringerTeller,
  endringerVindu,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { erInnboksFlate } from '../app/(app)/_shell/seksjon-sti.ts';
import { RONNY_IDLE, RONNY_PHONE_IDLE } from '../app/(app)/_workshop/ronny-idle.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('CODE-GO Mikael — toppkort Endringer + dither', () => {
  it('Endringer-rute og ekte avvik-telling, 0 vises', () => {
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=endringer');
    expect(PARKED_LABEL['/timeplan/endringer']).toBe('Endringer');
    expect(AVVIK_NOTAT_PREFIKS).toBe('[AVVIK ');
    expect(
      endringerTeller([
        { id: '1', status: 'confirmed', startsAt: '2026-09-08T08:00:00', notes: '[AVVIK 12] sen' },
        { id: '2', status: 'cancelled', startsAt: '2026-09-08T09:00:00', notes: '[AVVIK 1] x' },
        { id: '3', status: 'confirmed', startsAt: '2026-09-08T10:00:00', notes: null },
      ]),
    ).toBe(1);
    expect(endringerTeller([])).toBe(0);
    const vindu = endringerVindu(new Date('2026-09-08T10:00:00+02:00'));
    expect(vindu.fra).toBeInstanceOf(Date);
    expect(vindu.til).toBeInstanceOf(Date);
  });

  it('to-delt toppkort: dag+tall venstre, DitherDonut over Endringer, Avvik/Forespørsler nederst', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const side = utenKommentarer(les('../app/(app)/timeplan/endringer/page.tsx'));
    expect(kort).toMatch(/PulseHeroFlate/);
    expect(kort).toMatch(/data-pulse-hero-todelt/);
    expect(kort).toMatch(/data-pulse-ukedag/);
    expect(kort).toMatch(/data-pulse-dato/);
    expect(kort).toMatch(/PulseEndringerLenke/);
    expect(kort).toMatch(/PulseAvvikForesporBoks/);
    expect(kort).not.toMatch(/PulseValgLenke/);
    expect(kort).toMatch(/DitherDonutChart/);
    expect(kort).toMatch(/#141414/);
    expect(kort).toMatch(/PULSE_DAG_FYLL_HAIRLINE|#e0e0e0/);
    expect(kort).toMatch(/data-pulse-hero-bunn/);
    expect(kort).toMatch(/TriangleAlert/);
    expect(hjem).toMatch(/PulseHeroFlate/);
    expect(hjem).toMatch(/avvikTeller/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeLessThan(hjem.lastIndexOf('PulseJobbFlis'));
    expect(side).toMatch(/jobber\?fane=endringer/);
    expect(les('../app/(app)/jobber/_avvik.tsx')).toMatch(/data-timeplan-endringer/);
    expect(les('../app/(app)/jobber/_avvik.tsx')).toMatch(/Godkjenn/);
    expect(les('../app/(app)/jobber/_avvik.tsx')).toMatch(/F7-05/);
  });
});

describe('CODE-GO Mikael — innboks tom / sort / telefon', () => {
  it('tomtilstand er Ingen samtaler + Send melding, ikke Skriv til Endwise', () => {
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(side).toMatch(/Ingen samtaler/);
    expect(side).toMatch(/Send melding/);
    expect(side).not.toMatch(/Skriv til Endwise/);
  });

  it('sortering bor i Sortering-ark; Alle meldinger først; penn-SVG beholdt', () => {
    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    const ikon = utenKommentarer(les('../app/(app)/innboks/_ny-melding-ikon.tsx'));
    expect(bar).toMatch(/Alle meldinger/);
    expect(bar).toMatch(/Ny melding/);
    expect(bar).toMatch(/Nyeste/);
    expect(bar).toMatch(/Eldste/);
    expect(bar).toMatch(/SorteringArk/);
    expect(bar).not.toMatch(/ChevronDown/);
    expect(bar).not.toMatch(/DropdownMenu/);
    expect(bar).toMatch(/data-innboks-ny-samtale/);
    expect(ikon).toMatch(/15\.5 5/);
    expect(ikon).not.toMatch(/11\.9991 14\.25/);
    expect(ikon).not.toMatch(/MessageSquarePlus/);
  });

  it('telefon: liste skjules ved tråd/ny, chrome låser scroll, detaljer inne i flaten', () => {
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    const chrome = utenKommentarer(les('../app/(app)/innboks/_chrome.tsx'));
    const slot = utenKommentarer(les('../app/(app)/innboks/_detaljer-slot.tsx'));
    const detaljer = utenKommentarer(les('../app/(app)/innboks/_detaljer.tsx'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(side).toMatch(/skjulTelefonListe/);
    expect(side).toMatch(/nySamtale/);
    expect(chrome).toMatch(/data-innboks-chrome/);
    expect(chrome).toMatch(/relative flex h-full min-h-0 flex-1 flex-col overflow-hidden/);
    expect(slot).toMatch(/data-innboks-detaljer-chip/);
    expect(slot).toMatch(/hidden w-11/);
    expect(slot).toMatch(/absolute inset-0/);
    expect(slot).not.toMatch(/fixed top-0/);
    expect(detaljer).toMatch(/absolute inset-0/);
    expect(detaljer).not.toMatch(/fixed top-0/);
    expect(layout).toMatch(/erInnboksFlate/);
    expect(layout).toMatch(/overflow-hidden/);
    expect(erInnboksFlate('/innboks')).toBe(true);
    expect(erInnboksFlate('/innboks/abc')).toBe(true);
    expect(erInnboksFlate('/endwise/innboks')).toBe(true);
    expect(erInnboksFlate('/home')).toBe(false);
  });
});

describe('CODE-GO Mikael — Ronny uten sinne', () => {
  it('idle er kun curieux / heureux / wink / surpris', () => {
    expect([...RONNY_IDLE]).toEqual(['curieux', 'heureux', 'wink', 'surpris']);
    expect([...RONNY_PHONE_IDLE]).toEqual(['curieux', 'heureux', 'wink', 'surpris']);
    expect(RONNY_IDLE).not.toContain('colere');
    expect(RONNY_PHONE_IDLE).not.toContain('colere');
    const bot = utenKommentarer(les('../app/(app)/_workshop/ronny-bot.tsx'));
    expect(bot).toMatch(/wink \? 'wink' : 'idle'/);
    expect(bot).toMatch(/playing=\{false\}/);
    expect(bot).not.toMatch(/'colere'/);
    expect(bot).not.toMatch(/thinking|alert|notify/);
  });
});
