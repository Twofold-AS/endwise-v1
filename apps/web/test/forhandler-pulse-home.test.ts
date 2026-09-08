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
  HJEM_FOOTER_LENKER,
  HJEM_KORT_TOM,
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
  PHONE_KORT_META,
} from '../app/(app)/_shell/phone-home.ts';
import {
  ansattePaJobb,
  bookingMaanedVsForrige,
  foresporselTrend,
  formatVarighetNb,
  idagTall,
  idagVisning,
  lagerVenter,
  maanedSparkVisning,
  PULSE_MOCK_FORESPORSEL,
  PULSE_MOCK_IDAG,
  PULSE_MOCK_MAANED,
  sisteMeldinger,
} from '../app/(app)/_shell/phone-home-pulse.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('forhandler pulse-hjem v2 — I dag + linjekort', () => {
  it('låser I dag · Innboks · Lager · Team · Jobb', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual(['idag', 'innboks', 'lager', 'team', 'jobb']);
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual(DEALER_PULSE_KEYS.map((k) => [k]));
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).toEqual([...DEALER_PULSE_KEYS]);
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).not.toContain('butikk');
    expect(HJEM_FOOTER_LENKER.map((l) => l.label)).toEqual(['Organisasjon', 'Hjelp']);
  });

  it('fjerner Svarhastighet / Timeplan-gulv / gammel Team-flate og døde nav-kort', () => {
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
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/Ingen kunder ennå|Åpne organisasjon|Artikler og support/);
    expect(hjem).not.toMatch(/data-hjem-seksjon/);
    expect(hjem).not.toMatch(/Timeplan-gulv|Svarhastighet|PeopleShowcase/);
    expect(hjem).not.toMatch(/messages\.svarhastighet/);
    expect(hjem).not.toMatch(/DitherGrowthChart|ferdigSpark7d/);
    expect(hjem).toMatch(/PulseFooter|Organisasjon/);
    expect(hjem).toMatch(/PulseLinjeKort/);
    expect(hjem).toMatch(/Les alle siste meldinger/);
    expect(hjem).toMatch(/Trenger godkjenning/);
    expect(hjem).toMatch(/Ansatte på jobb/);
    expect(hjem).toMatch(/tekst="Jobb"/);
    expect(hjem).toMatch(/PulseMaanedBoble/);
    expect(hjem).not.toMatch(/dither-kit|DitherGradient/);
    expect(hjem).not.toMatch(/For lite data/);
  });

  it('I dag er Planlagt / Pågår / Ferdig — ikke Starter, ikke 7d-spark', () => {
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
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/Planlagt/);
    expect(hjem).not.toMatch(/Starter/);
  });

  it('månedsboble er denne vs forrige, mock når begge er null', () => {
    const naa = new Date('2026-08-29T10:00:00');
    const raw = bookingMaanedVsForrige(
      [
        { id: '1', status: 'confirmed', startsAt: '2026-08-05T08:00:00' },
        { id: '2', status: 'completed', startsAt: '2026-08-20T08:00:00' },
        { id: '3', status: 'confirmed', startsAt: '2026-07-12T08:00:00' },
        { id: '4', status: 'cancelled', startsAt: '2026-08-10T08:00:00' },
      ],
      naa,
    );
    expect(raw.denne).toBe(2);
    expect(raw.forrige).toBe(1);
    expect(maanedSparkVisning(raw).mock).toBe(false);
    const tom = maanedSparkVisning(bookingMaanedVsForrige([], naa));
    expect(tom.mock).toBe(true);
    expect(tom.denne).toBe(PULSE_MOCK_MAANED.denne);
    expect(tom.forrige).toBe(PULSE_MOCK_MAANED.forrige);
  });

  it('Innboks-teller er uleste siste meldinger', () => {
    expect(sisteMeldinger([])).toEqual({ ulest: 0 });
    expect(
      sisteMeldinger([
        { subject: 'Ny', unread: 1, lastMessageAt: '2026-08-29T11:00:00' },
        { subject: 'Gammel', unread: 2, lastMessageAt: '2026-08-29T08:00:00' },
      ]),
    ).toEqual({ ulest: 3 });
  });

  it('forespørsel-trend er grønn over snitt, rød under, ellers mock', () => {
    const naa = new Date('2026-08-29T12:00:00');
    expect(foresporselTrend([], naa)).toMatchObject({ ...PULSE_MOCK_FORESPORSEL, mock: true });
    const historikk: { id: string; status: string; startsAt: string; source: string }[] = [];
    for (let i = 1; i <= 14; i++) {
      const dag = String(29 - i).padStart(2, '0');
      historikk.push({
        id: `h${i}`,
        status: 'draft',
        startsAt: `2026-08-${dag}T09:00:00`,
        source: 'widget',
      });
    }
    const mange = foresporselTrend(
      [
        ...historikk,
        { id: 'i dag', status: 'draft', startsAt: '2026-08-29T08:00:00', source: 'widget' },
        { id: 'i dag 2', status: 'draft', startsAt: '2026-08-29T09:00:00', source: 'widget' },
        { id: 'i dag 3', status: 'draft', startsAt: '2026-08-29T10:00:00', source: 'widget' },
      ],
      naa,
    );
    expect(mange.mock).toBe(false);
    expect(mange.antall).toBe(3);
    expect(mange.tone).toBe('green');
    const faa = foresporselTrend(historikk, naa);
    expect(faa.mock).toBe(false);
    expect(faa.antall).toBe(0);
    expect(faa.tone).toBe('red');
  });

  it('Lager teller deler som venter / trenger godkjenning', () => {
    expect(lagerVenter([]).antall).toBe(0);
    expect(lagerVenter([]).tekst).toBe('Trenger godkjenning');
    expect(
      lagerVenter([{ name: 'Filter', reserved: 0, tilgjengelig: 4, underMinimum: false }]).antall,
    ).toBe(0);
    expect(
      lagerVenter([{ name: 'Olje filter', reserved: 2, tilgjengelig: 0, underMinimum: true }])
        .antall,
    ).toBe(1);
  });

  it('I dag uten historikk er mock-tall + mock-måned, ikke For lite data', () => {
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
    expect(formatVarighetNb(2 * 3_600_000 + 12 * 60_000)).toBe('2 t 12 min');
  });

  it('Ansatte på jobb er på_jobb+opptatt av totalt', () => {
    expect(ansattePaJobb([])).toEqual({
      paJobb: 0,
      total: 0,
      tekst: 'Ansatte på jobb',
      tall: '0/0',
    });
    expect(
      ansattePaJobb([
        { id: '1', status: 'ledig' },
        { id: '2', status: 'på_jobb' },
        { id: '3', status: 'opptatt' },
        { id: '4', status: 'fri' },
      ]),
    ).toEqual({ paJobb: 2, total: 4, tekst: 'Ansatte på jobb', tall: '2/4' });
  });

  it('kort er Mobbin 24px uten skygge og uten pip; grønn/rød kun på trend', () => {
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
    expect(kort).toMatch(/data-pulse-linje/);
    expect(kort).toMatch(/data-pulse-pil-hale/);
    expect(kort).toMatch(/bg-white/);
    expect(kort).toMatch(/bg-success/);
    expect(kort).toMatch(/bg-danger/);
    expect(kort).toMatch(/DitherGrowthChart/);
    expect(HJEM_KORT_TOM.lagerVenter).toBe('Trenger godkjenning');
    expect(HJEM_KORT_TOM.jobb).toBe('Jobb');
    expect(PHONE_KORT_META.jobb.href).toBe('/bookinger/ny');
  });

  it('desktop og telefon deler pulse-kort; chrome-skall røres ikke', () => {
    const dash = utenKommentarer(les('../app/(app)/home/page.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const profil = utenKommentarer(les('../app/(app)/_shell/phone-profil-meny.tsx'));
    expect(dash).toMatch(/DealerPulseKort/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(hjem).toMatch(/PulseMaanedBoble/);
    expect(hjem).not.toMatch(/phone-profil-meny|RonnyAvatarKnapp/);
    expect(shell).toMatch(/data-phone-search/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(profil).toMatch(/LogOut/);
  });
});
