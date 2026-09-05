import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import {
  DEALER_PHONE_HJEM,
  dealerPhoneHjemRader,
  FORBUDT_DEALER_HJEM,
  flatDealerHjemKeys,
  HJEM_KORT_TOM,
  PHONE_HERO_FYLL,
  PHONE_KORT_FYLL,
  PHONE_KORT_META,
  samarbeidSynligINav,
} from '../app/(app)/_shell/phone-home.ts';
import {
  innboksMeta,
  jobberMeta,
  kunderMeta,
  lagerMeta,
  organisasjonMeta,
  statistikkSetning,
  timeplanRader,
  verkstedHeroTall,
} from '../app/(app)/_shell/phone-home-data.ts';
import { destinasjonFaner } from '../app/(app)/_shell/seksjon-faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Jonas 05.09 — forhandler-hjem Apple-kort', () => {
  it('låser hero → Timeplan|Rapporter → Innboks|Jobber → Kunder|Organisasjon → Samarbeid|Hjelp → Lager', () => {
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual([
      ['verkstedet'],
      ['timeplan', 'statistikk'],
      ['innboks', 'jobber'],
      ['kunder', 'organisasjon'],
      ['samarbeid', 'hjelp'],
      ['lager'],
    ]);
    expect(PHONE_KORT_META.statistikk.label).toBe('Rapporter');
    expect(PHONE_KORT_META.statistikk.href).toBe('/rapporter');
    expect(PHONE_KORT_META.timeplan.href).toBe('/jobber?visning=kalender');
    expect(PHONE_KORT_META.jobber.label).toBe('Jobber');
    expect(PHONE_KORT_META.jobber.href).toBe('/jobber');
    expect(PHONE_KORT_META.organisasjon.href).toBe('/organisasjon');
  });

  it('hopper Samarbeid når raden er skjult i nav — ingen tom plassholder', () => {
    expect(samarbeidSynligINav()).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.key === 'samarbeid')).toBe(false);
    const uten = dealerPhoneHjemRader(false);
    expect(uten.map((r) => r.keys.join('|'))).toEqual([
      'verkstedet',
      'timeplan|statistikk',
      'innboks|jobber',
      'kunder|organisasjon',
      'hjelp',
      'lager',
    ]);
    expect(uten.find((r) => r.keys.join('|') === 'hjelp')?.kind).toBe('full');
    expect(dealerPhoneHjemRader(false, true).map((r) => r.keys)).toContainEqual([
      'samarbeid',
      'hjelp',
    ]);
    expect(dealerPhoneHjemRader(true).at(-1)?.keys).toEqual(['lager', 'butikk']);
  });

  it('ingen hjem-kort for Book, Oppslag, AI, Kompetanse, Prisliste, Abonnement', () => {
    const keys = flatDealerHjemKeys(true);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(keys).not.toContain(forbudt);
    }
    expect(keys).not.toContain('tjenester');
    expect(keys).not.toContain('prisliste');
  });

  it('ingen Organisasjon-piller på dealer-hjem', () => {
    expect(
      destinasjonFaner({
        pathname: '/dashboard',
        role: 'dealer_admin',
        shell: 'forhandler',
      }),
    ).toEqual([]);
    expect(
      destinasjonFaner({
        pathname: '/verkstedet',
        role: 'dealer_admin',
        shell: 'forhandler',
      }),
    ).toEqual([]);
    expect(
      destinasjonFaner({
        pathname: '/dashboard',
        search: 'visning=dag',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      destinasjonFaner({
        pathname: '/organisasjon',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => f.label),
    ).toEqual(['Oversikt', 'Ansatte', 'Abonnement', 'Integrasjoner']);
  });

  it('hero er surface+hairline radius 16, ikke #111, med I dag/Pågår/Fullført', () => {
    expect(PHONE_HERO_FYLL).toMatch(/rounded-\[16px\]/);
    expect(PHONE_HERO_FYLL).toMatch(/bg-card/);
    expect(PHONE_HERO_FYLL).toMatch(/border-border/);
    expect(PHONE_HERO_FYLL).not.toMatch(/#111|bg-fg|Grainient|Galaxy/);
    expect(PHONE_KORT_FYLL).toMatch(/rounded-xl/);
    expect(PHONE_KORT_FYLL).not.toMatch(/shadow-sm|shadow-md|#111/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    expect(hjem).toMatch(/I dag/);
    expect(hjem).toMatch(/Pågår/);
    expect(hjem).toMatch(/Fullført/);
    expect(hjem).toMatch(/variant="hero"/);
    expect(hjem).toMatch(/HJEM_KORT_TOM\.hero/);
    expect(kort).toMatch(/min-h-11/);
    expect(kort).toMatch(/data-verkstedet-hero/);
    expect(kort).not.toMatch(/Grainient|Galaxy|#111/);
  });

  it('Timeplan viser 3–4 rader; tomtilstander følger fasit', () => {
    const naa = new Date('2026-08-29T10:00:00');
    const rader = timeplanRader(
      [
        {
          id: '1',
          status: 'confirmed',
          startsAt: '2026-08-29T08:00:00',
          serviceName: 'EU-kontroll',
          regNumber: 'EL12345',
        },
        {
          id: '2',
          status: 'in_progress',
          startsAt: '2026-08-29T09:00:00',
          serviceName: 'Olje',
        },
        {
          id: '3',
          status: 'completed',
          startsAt: '2026-08-29T07:00:00',
          serviceName: 'Dekk',
        },
        {
          id: '4',
          status: 'confirmed',
          startsAt: '2026-08-29T14:00:00',
          serviceName: 'Service',
        },
        {
          id: '5',
          status: 'confirmed',
          startsAt: '2026-08-29T16:00:00',
          serviceName: 'For mye',
        },
      ],
      naa,
      4,
    );
    expect(rader).toHaveLength(4);
    expect(verkstedHeroTall([], naa)).toEqual({ idag: 0, paagaar: 0, fullfort: 0 });
    expect(jobberMeta([], naa)).toBe(HJEM_KORT_TOM.jobber);
    expect(innboksMeta([])).toEqual({ ulest: 0, linje: HJEM_KORT_TOM.innboks });
    expect(kunderMeta([])).toBe(HJEM_KORT_TOM.kunder);
    expect(organisasjonMeta([])).toBe(HJEM_KORT_TOM.organisasjon);
    expect(statistikkSetning([], naa)).toBe(HJEM_KORT_TOM.rapporter);
    expect(lagerMeta([], [])).toBe(HJEM_KORT_TOM.lager);
    expect(HJEM_KORT_TOM.hjelp).toBe('Artikler og support');
    expect(HJEM_KORT_TOM.hero).toBe('Ingen jobber i dag');
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/timeplanRader/);
    expect(hjem).not.toMatch(/Ny jobb/);
    expect(hjem).not.toMatch(/DestinasjonSeksjonBar|OrganisasjonSeksjonBar/);
  });

  it('desktop hjem er samme destinasjonskort — ikke KPI-dump eller org-piller', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(dash).toMatch(/DealerDestinasjonskort/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(dash).toMatch(/sr-only/);
    expect(dash).not.toMatch(/AnsattePaJobb/);
    expect(dash).not.toMatch(/Dagens saker/);
    expect(dash).not.toMatch(/Grainient|Galaxy/);
    expect(dash).not.toMatch(/#111/);
  });

  it('speiler fasit i docs/', () => {
    const fasit = les('../../../docs/endwise-forhandler-hjem-apple-fasit.md');
    expect(fasit).toMatch(/Timeplan \| Rapporter/);
    expect(fasit).toMatch(/Innboks \| Jobber/);
    expect(fasit).toMatch(/Ikke Organisasjon-piller/);
    expect(fasit).toMatch(/#f5f5f7/);
    expect(fasit).toMatch(/radius 16/);
  });
});
