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
  delerPaApneJobber,
  ferdigSpark7d,
  formatVarighetNb,
  idagTall,
  idagVisning,
  innboksPulse,
  nesteTreJobber,
  PULSE_MOCK_IDAG,
  PULSE_MOCK_SPARK,
  sparkVisning,
  svarhastighetVisning,
  teamPulse,
} from '../app/(app)/_shell/phone-home-pulse.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('forhandler pulse-hjem — seks kort + footer', () => {
  it('låser I dag · Innboks · Deler · Svarhastighet · Timeplan-gulv · Team', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'deler',
      'svarhastighet',
      'timeplan',
      'team',
    ]);
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual(DEALER_PULSE_KEYS.map((k) => [k]));
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).toEqual([...DEALER_PULSE_KEYS]);
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).not.toContain('butikk');
    expect(HJEM_FOOTER_LENKER.map((l) => l.label)).toEqual(['Organisasjon', 'Hjelp']);
  });

  it('dreper døde nav-kort og holder forbudte destinasjoner ute', () => {
    const keys = flatDealerHjemKeys(true);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(keys).not.toContain(forbudt);
    }
    expect(keys).not.toContain('hjelp');
    expect(keys).not.toContain('organisasjon');
    expect(keys).not.toContain('kunder');
    expect(keys).not.toContain('samarbeid');
    expect(keys).not.toContain('statistikk');
    expect(keys).not.toContain('jobber');
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/Ingen kunder ennå|Åpne organisasjon|Artikler og support/);
    expect(hjem).not.toMatch(/data-hjem-seksjon/);
    expect(hjem).toMatch(/PulseFooter|Organisasjon/);
    expect(hjem).toMatch(/Timeplan-gulv/);
    expect(hjem).toMatch(/DitherGrowthChart/);
    expect(hjem).not.toMatch(/dither-kit|DitherGradient/);
    expect(hjem).not.toMatch(/For lite data/);
  });

  it('I dag er Starter / Pågår / Ferdig + 7d-spark, ikke hele-dagen-totalt', () => {
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
    ).toEqual({ starter: 1, paagaar: 1, ferdig: 1 });
    const spark = ferdigSpark7d(
      [
        { id: '3', status: 'completed', startsAt: '2026-08-29T07:00:00' },
        { id: '5', status: 'completed', startsAt: '2026-08-28T07:00:00' },
      ],
      naa,
    );
    expect(spark.values).toHaveLength(7);
    expect(spark.values.at(-1)).toBe(1);
    expect(spark.values.at(-2)).toBe(1);
    expect(PHONE_KORT_META.idag.href).toContain('visning=dag');
  });

  it('Innboks SLA er eldste uleste, ellers Ingen uleste', () => {
    const naa = new Date('2026-08-29T12:00:00');
    expect(innboksPulse([], naa)).toEqual({ ulest: 0, sla: 'Ingen uleste', eldsteAt: null });
    const pulse = innboksPulse(
      [
        { subject: 'Ny', unread: 1, lastMessageAt: '2026-08-29T11:00:00' },
        { subject: 'Gammel', unread: 2, lastMessageAt: '2026-08-29T08:00:00' },
      ],
      naa,
    );
    expect(pulse.ulest).toBe(3);
    expect(pulse.sla).toMatch(/Eldste uleste/);
    expect(pulse.sla).toMatch(/4 t/);
  });

  it('Deler teller kun reserved+lav når det finnes åpne jobber', () => {
    const apen = [{ id: '1', status: 'confirmed', startsAt: '2026-08-29T08:00:00' }];
    expect(delerPaApneJobber([], []).antall).toBe(0);
    expect(delerPaApneJobber([], []).meta).toBe('Ingen åpne jobber');
    expect(
      delerPaApneJobber(
        [{ name: 'Filter', reserved: 0, tilgjengelig: 0, underMinimum: true }],
        apen,
      ),
    ).toEqual({ antall: 0, meta: 'Ingen mangler på åpne jobber' });
    expect(
      delerPaApneJobber(
        [{ name: 'Olje filter', reserved: 2, tilgjengelig: 0, underMinimum: true }],
        apen,
      ).antall,
    ).toBe(1);
  });

  it('Svarhastighet er median 7d, ellers 14 min + mock', () => {
    expect(svarhastighetVisning(null)).toEqual({
      tall: '14 min',
      meta: 'Median førstesvar · 7 dager',
      mock: true,
    });
    expect(svarhastighetVisning(12 * 60_000)).toEqual({
      tall: '12 min',
      meta: 'Median førstesvar · 7 dager',
      mock: false,
    });
    expect(formatVarighetNb(2 * 3_600_000 + 12 * 60_000)).toBe('2 t 12 min');
  });

  it('I dag uten historikk er mock-tall + mock-spark, ikke For lite data', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(idagVisning([], naa)).toEqual({ ...PULSE_MOCK_IDAG, mock: true });
    expect(
      idagVisning([{ id: '1', status: 'confirmed', startsAt: '2026-08-29T08:00:00' }], naa),
    ).toEqual({
      starter: 1,
      paagaar: 0,
      ferdig: 0,
      mock: false,
    });
    const tomSpark = sparkVisning(ferdigSpark7d([], naa));
    expect(tomSpark.mock).toBe(true);
    expect(tomSpark.values).toEqual(PULSE_MOCK_SPARK);
    const ekteSpark = sparkVisning(
      ferdigSpark7d([{ id: '3', status: 'completed', startsAt: '2026-08-29T07:00:00' }], naa),
    );
    expect(ekteSpark.mock).toBe(false);
    expect(ekteSpark.values.at(-1)).toBe(1);
  });

  it('Timeplan-gulv er neste 3 med tid · hva · mekaniker', () => {
    const naa = new Date('2026-08-29T06:00:00');
    const rader = nesteTreJobber(
      [
        {
          id: '1',
          status: 'confirmed',
          startsAt: '2026-08-29T08:00:00',
          serviceName: 'EU-kontroll',
          mechanicName: 'Kari',
        },
        {
          id: '2',
          status: 'confirmed',
          startsAt: '2026-08-29T10:00:00',
          serviceName: 'Olje',
          mechanicName: 'Jonas',
        },
        {
          id: '3',
          status: 'confirmed',
          startsAt: '2026-08-29T14:00:00',
          serviceName: 'Dekk',
        },
        {
          id: '4',
          status: 'confirmed',
          startsAt: '2026-08-29T16:00:00',
          serviceName: 'Ekstra',
        },
      ],
      naa,
      3,
    );
    expect(rader).toHaveLength(3);
    expect(rader[0]).toMatchObject({ what: 'EU-kontroll', who: 'Kari' });
    expect(rader[1]?.who).toBe('Jonas');
    expect(rader[2]?.who).toBe('—');
  });

  it('Team er ledig/opptatt, på_jobb teller som opptatt', () => {
    expect(teamPulse([])).toEqual({ ledig: 0, opptatt: 0, meta: 'Ingen mekanikere' });
    expect(
      teamPulse([
        { id: '1', status: 'ledig' },
        { id: '2', status: 'på_jobb' },
        { id: '3', status: 'opptatt' },
        { id: '4', status: 'fri' },
      ]),
    ).toEqual({ ledig: 1, opptatt: 2, meta: '1 ledig · 2 opptatt' });
  });

  it('kort er Mobbin 24px uten skygge og uten pip', () => {
    expect(PHONE_HERO_FYLL).toMatch(/rounded-\[24px\]/);
    expect(PHONE_HERO_FYLL).toMatch(/shadow-none/);
    expect(PHONE_DEST_FYLL).toMatch(/border-divide/);
    expect(PHONE_DEST_FYLL).not.toMatch(/border-left|border-l-/);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(kort).not.toMatch(/shadow-sm|shadow-md|border-left|border-l-/);
    expect(kort).toMatch(/touch-action:\s*manipulation|\[touch-action:manipulation\]/);
    expect(HJEM_KORT_TOM.innboks).toBe('Ingen uleste');
    expect(HJEM_KORT_TOM.svarhastighet).toBe('Median førstesvar · 7 dager');
    expect(HJEM_KORT_TOM.svarhastighet).not.toMatch(/For lite data|for lite/);
    expect(kort).toMatch(/PulseMockBadge|data-pulse-mock-badge/);
    expect(kort).toMatch(/variant="secondary"/);
    expect(kort).not.toMatch(/#0066ff|For lite data/);
    expect(kort).toMatch(/>\s*mock\s*</);
  });

  it('desktop og telefon deler pulse-kort; chrome-skall røres ikke', () => {
    const dash = utenKommentarer(les('../app/(app)/home/page.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(dash).toMatch(/DealerPulseKort/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(hjem).toMatch(/messages\.svarhastighet/);
    expect(hjem).toMatch(/DitherGrowthChart/);
    expect(shell).toMatch(/data-phone-search/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
  });
});
