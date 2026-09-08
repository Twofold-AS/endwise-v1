import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEALER_PHONE_HJEM,
  DEALER_PULSE_KEYS,
  dealerPhoneHjemRader,
  FORBUDT_DEALER_HJEM,
  flatDealerHjemKeys,
  HJEM_KORT_TOM,
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
  PHONE_KORT_META,
} from '../app/(app)/_shell/phone-home.ts';
import {
  ansattePulse,
  forrigeManedStart,
  idagTall,
  idagVisning,
  innboksRad,
  lagerRad,
  manedBookingTall,
  manedSparkVerdier,
  manedVindu,
  osloManedKey,
  osloStartAvManed,
  PULSE_MOCK_IDAG,
  PULSE_MOCK_INNBOKS_MELDINGER,
  PULSE_MOCK_MANED,
} from '../app/(app)/_shell/phone-home-pulse.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('forhandler pulse-hjem — fem flater', () => {
  it('låser Planlagt-kort · Innboks · Lager · ansatte + Jobb', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual(['idag', 'innboks', 'lager', 'team', 'jobb']);
    expect(DEALER_PULSE_KEYS).toHaveLength(5);
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual([
      ['idag'],
      ['innboks'],
      ['lager'],
      ['team', 'jobb'],
    ]);
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).toEqual([...DEALER_PULSE_KEYS]);
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).not.toContain('butikk');
    expect(DEALER_PHONE_HJEM.at(-1)?.kind).toBe('pair');
  });

  it('dreper Svarhastighet, Timeplan-gulv, Team-liste, footer og døde nav-kort', () => {
    const keys = flatDealerHjemKeys(true);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(keys).not.toContain(forbudt);
    }
    expect(keys).not.toContain('svarhastighet');
    expect(keys).not.toContain('timeplan');
    expect(keys).not.toContain('deler');
    expect(keys).not.toContain('hjelp');
    expect(keys).not.toContain('organisasjon');
    expect(keys).not.toContain('kunder');
    expect(keys).not.toContain('samarbeid');
    expect(keys).not.toContain('statistikk');
    expect(keys).not.toContain('jobber');
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(hjem).not.toMatch(/Svarhastighet|Timeplan-gulv|PulseFooter|PeopleShowcase/);
    expect(hjem).not.toMatch(/Organisasjon|Hjelp|svarhastighet/);
    expect(hjem).not.toMatch(/Ingen kunder ennå|Åpne organisasjon|Artikler og support/);
    expect(hjem).not.toMatch(/data-hjem-seksjon/);
    expect(hjem).toMatch(/Les alle siste meldinger/);
    expect(hjem).toMatch(/PulseManedBoble/);
    expect(hjem).toMatch(/PulseJobbFlis/);
    expect(hjem).toMatch(/Planlagt/);
    expect(hjem).not.toMatch(/dither-kit|DitherGradient|DitherDonutChart/);
    expect(hjem).not.toMatch(/pulse-preview/);
    expect(hjem).not.toMatch(/For lite data/);
    expect(hjem).not.toMatch(/bar=\{|nye=\{|tone=\{/);
    expect(kort).not.toMatch(/PulseFooter/);
    expect(kort).toMatch(/Les alle siste meldinger|PulseRadKort/);
  });

  it('I dag er Planlagt / Pågår / Ferdig, ikke hele-dagen-totalt', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(
      idagTall(
        [
          { id: '1', status: 'confirmed', startsAt: '2026-08-29T08:00:00', serviceName: 'EU' },
          { id: '2', status: 'in_progress', startsAt: '2026-08-29T09:00:00', serviceName: 'Olje' },
          { id: '3', status: 'completed', startsAt: '2026-08-29T07:00:00', serviceName: 'Dekk' },
          {
            id: '4',
            status: 'confirmed',
            startsAt: '2026-08-30T08:00:00',
            serviceName: 'I morgen',
          },
        ],
        naa,
      ),
    ).toEqual({ planlagt: 1, paagaar: 1, ferdig: 1 });
    expect(PHONE_KORT_META.idag.href).toContain('visning=dag');
  });

  it('månedsboble er denne vs forrige, ellers mock — aldri For lite data', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(osloManedKey(naa)).toBe('2026-08');
    expect(osloStartAvManed(naa).toISOString()).toMatch(/2026-07-31|2026-08-01/);
    expect(osloManedKey(forrigeManedStart(naa))).toBe('2026-07');
    expect(manedVindu(naa).fra.getTime()).toBe(forrigeManedStart(naa).getTime());
    expect(manedBookingTall([], naa)).toEqual({ ...PULSE_MOCK_MANED, mock: true });
    expect(
      manedBookingTall(
        [
          { id: '1', status: 'confirmed', startsAt: '2026-08-10T08:00:00' },
          { id: '2', status: 'completed', startsAt: '2026-08-20T08:00:00' },
          { id: '3', status: 'confirmed', startsAt: '2026-07-15T08:00:00' },
          { id: '4', status: 'cancelled', startsAt: '2026-08-12T08:00:00' },
        ],
        naa,
      ),
    ).toEqual({ denne: 2, forrige: 1, mock: false });
    expect(manedSparkVerdier(14, 18)).toEqual([14, 18]);
    expect(manedSparkVerdier(-1, 4)).toEqual([0, 4]);
  });

  it('Innboks-rad viser kun meldingstall, mock uten historikk', () => {
    expect(innboksRad([])).toEqual({
      meldinger: PULSE_MOCK_INNBOKS_MELDINGER,
      mock: true,
    });
    expect(
      innboksRad([
        { subject: 'A', unread: 2, lastMessageAt: '2026-08-29T11:00:00' },
        { subject: 'B', unread: 1, lastMessageAt: '2026-08-28T11:00:00' },
      ]),
    ).toEqual({ meldinger: 3, mock: false });
    expect(
      innboksRad([{ subject: 'Tom', unread: 0, lastMessageAt: '2026-08-28T11:00:00' }]),
    ).toEqual({ meldinger: 0, mock: false });
  });

  it('Lager-rad er venter på bestilling / trenger godkjenning', () => {
    expect(lagerRad([])).toEqual({
      antall: 0,
      godkjenning: 0,
      tittel: 'Venter på bestilling',
    });
    expect(
      lagerRad([{ name: 'Filter', reserved: 0, tilgjengelig: 2, underMinimum: false }]),
    ).toEqual({ antall: 0, godkjenning: 0, tittel: 'Venter på bestilling' });
    expect(lagerRad([{ name: 'Olje', reserved: 0, tilgjengelig: 0, underMinimum: true }])).toEqual({
      antall: 1,
      godkjenning: 0,
      tittel: 'Venter på bestilling',
    });
    expect(lagerRad([{ name: 'Kloss', reserved: 2, tilgjengelig: 0, underMinimum: true }])).toEqual(
      { antall: 1, godkjenning: 1, tittel: 'Trenger godkjenning' },
    );
  });

  it('I dag uten historikk er mock-tall + mock-boble, ikke For lite data', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(idagVisning([], naa)).toEqual({ ...PULSE_MOCK_IDAG, mock: true });
    expect(
      idagVisning([{ id: '1', status: 'confirmed', startsAt: '2026-08-29T08:00:00' }], naa),
    ).toEqual({
      planlagt: 1,
      paagaar: 0,
      ferdig: 0,
      mock: false,
    });
  });

  it('ansatte er på jobb / totalt, ikke ledig/opptatt-liste', () => {
    expect(ansattePulse([])).toEqual({ paJobb: 0, totalt: 0 });
    expect(
      ansattePulse([
        { id: '1', status: 'ledig' },
        { id: '2', status: 'på_jobb' },
        { id: '3', status: 'opptatt' },
        { id: '4', status: 'fri' },
      ]),
    ).toEqual({ paJobb: 2, totalt: 4 });
  });

  it('kort er Mobbin 24px uten skygge og uten pip', () => {
    expect(PHONE_HERO_FYLL).toMatch(/rounded-\[24px\]/);
    expect(PHONE_HERO_FYLL).toMatch(/shadow-none/);
    expect(PHONE_DEST_FYLL).toMatch(/border-divide/);
    expect(PHONE_DEST_FYLL).not.toMatch(/border-left|border-l-/);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(kort).not.toMatch(/shadow-sm|shadow-md|border-left|border-l-/);
    expect(kort).toMatch(/touch-action:\s*manipulation|\[touch-action:manipulation\]/);
    expect(kort).toMatch(/PulseMockBadge|data-pulse-mock-badge/);
    expect(kort).toMatch(/variant="secondary"/);
    expect(kort).not.toMatch(/#0066ff|For lite data/);
    expect(kort).toMatch(/>\s*mock\s*</);
    expect(kort).toMatch(/ArrowUpRight/);
    expect(kort).toMatch(/PulseJobbFlis|data-pulse-jobb/);
    expect(kort).toMatch(/DitherGrowthChart/);
    expect(kort).not.toMatch(/DitherDonutChart/);
    expect(kort).not.toMatch(/PulseMiniBar|data-pulse-nye|data-pulse-stats-bar/);
    expect(kort).toMatch(/data-pulse-ikonboks/);
    expect(kort).toMatch(/size=\{22\}/);
    expect(kort).toMatch(/#ffffff/);
    expect(kort).not.toMatch(/bg-canvas|bg-card text-fg shadow-none ring-1/);
    expect(kort).toMatch(/flex min-h-11 items-center gap-3/);
    expect(kort).not.toMatch(/flex-col items-center justify-center gap-1/);
    expect(HJEM_KORT_TOM.svarhastighet).not.toMatch(/For lite data|for lite/);
  });

  it('desktop og telefon deler pulse-kort; chrome-skall røres ikke', () => {
    const dash = utenKommentarer(les('../app/(app)/home/page.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(dash).toMatch(/DealerPulseKort/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(hjem).not.toMatch(/messages\.svarhastighet/);
    expect(hjem).toMatch(/PulseManedBoble/);
    expect(hjem).toMatch(/bookinger\/ny|PulseJobbFlis/);
    expect(shell).toMatch(/data-phone-search/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
  });

  it('pulse-preview er visuell GO, ikke et sjette hjem-kort', () => {
    const preview = utenKommentarer(les('../app/pulse-preview/page.tsx'));
    expect(preview).toMatch(/data-pulse-preview="go"/);
    expect(preview).toMatch(/PulseManedBoble/);
    expect(preview).toMatch(/PulseJobbFlis/);
    expect(preview).not.toMatch(/DitherDonutChart|PulseMiniBar|data-pulse-nye/);
    expect(DEALER_PULSE_KEYS).not.toContain('preview');
  });

  it('+ Jobb peker på ny jobb, ikke Timeplan-liste', () => {
    expect(PHONE_KORT_META.jobb.href).toBe('/bookinger/ny');
    expect(PHONE_KORT_META.jobb.label).toBe('Jobb');
    expect(PHONE_KORT_META.lager.href).toBe('/lager');
  });
});
