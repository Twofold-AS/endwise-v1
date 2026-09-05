import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { osloKalenderdag, osloPlusDager, osloVeggklokke } from '../app/(app)/_lib/oslo-dag.ts';
import {
  adresseLinje,
  FERIE_MOCK,
  formatLeftoverVerdi,
  kjoretoyIkon,
  visKortFelt,
} from '../app/(app)/_shell/forhandler-kort.ts';
import { erTillattMekanikerSti, MEKANIKER_NAV } from '../app/(app)/_shell/nav.ts';
import {
  erMekanikerPhoneHjem,
  MEKANIKER_PHONE_HURTIG,
  mekanikerHurtigKort,
  PHONE_KORT_META,
  PHONE_SAFE_BUNN,
  PHONE_SHELL_ROT,
} from '../app/(app)/_shell/phone-home.ts';
import {
  TIMEPLAN_DAG_SLUTT,
  TIMEPLAN_DAG_START,
  timeplanDagerFra,
  timeplanManedNavn,
  timeplanSkiftManed,
} from '../app/(app)/_shell/timeplan-dager.ts';
import {
  osloStartFraFelt,
  tilOsloDato,
  tilOsloMinutt,
  tilOsloTime,
} from '../app/(app)/bookinger/_starttid.ts';
import { HJEM_JOBBER_MAX, hjemJobbSlots } from '../app/(app)/dine-jobber/_hjem.ts';
import { jobbStatusKnapper } from '../app/(app)/min-dag/_status.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Dine jobber erstatter Min dag', () => {
  it('nav-label og rute er Dine jobber /dine-jobber', () => {
    expect(MEKANIKER_NAV.map((i) => i.label)).toEqual([
      'Dine jobber',
      'Jobbene mine',
      'Lager',
      'Butikk',
      'Kompetanse',
      'Timeplan',
      'Meg',
    ]);
    expect(MEKANIKER_NAV[0]?.href).toBe('/dine-jobber');
    expect(MEKANIKER_NAV.some((i) => i.label === 'Min dag')).toBe(false);
    expect(erTillattMekanikerSti('/dine-jobber')).toBe(true);
    expect(erTillattMekanikerSti('/min-dag/abc')).toBe(true);
  });

  it('telefon-hjem har stort Dine jobber-kort, ikke Min dag-hero eller Detaljer-accordion', () => {
    expect(MEKANIKER_PHONE_HURTIG).toEqual(['kompetanse', 'timeplan', 'hjelp']);
    expect(mekanikerHurtigKort(false)).not.toContain('butikk');
    expect(mekanikerHurtigKort(false)).not.toContain('dine-jobber');
    expect(PHONE_KORT_META['dine-jobber']?.href).toBe('/dine-jobber');
    expect(PHONE_KORT_META['dine-jobber']?.label).toBe('Dine jobber');
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    expect(hjem).not.toMatch(/Min dag/);
    expect(hjem).not.toMatch(/Detaljer/);
    expect(hjem).not.toMatch(/aria-expanded/);
    expect(hjem).toMatch(/ForhandlerInfoKort|forhandler-info/);
    expect(hjem).toMatch(/DineJobberHjemKort/);
    expect(erMekanikerPhoneHjem('/min-dag')).toBe(true);
    expect(erMekanikerPhoneHjem('/dine-jobber')).toBe(false);
  });

  it('Dine jobber-siden har jobb-bokser mot START/FULLFØRT, uten duplisert forhandlernavn', () => {
    const side = utenKommentarer(les('../app/(app)/dine-jobber/page.tsx'));
    const flate = utenKommentarer(les('../app/(app)/dine-jobber/_flate.tsx'));
    const rad = utenKommentarer(les('../app/(app)/dine-jobber/_rad.tsx'));
    expect(side + flate).toMatch(/Dine jobber/);
    expect(flate).toMatch(/ForhandlerInfoKort|forhandler-info/);
    expect(flate).not.toMatch(/data-forhandlernavn/);
    expect(rad).toMatch(/\/min-dag\/\$\{/);
    expect(rad).toMatch(/ChevronRight|aria-label="Detaljer/);
    expect(rad).toMatch(/kjoretoyIkon|vehicleType/);
    expect(side + flate).not.toMatch(/Kontor|Gulvet/);
    expect(side + flate).not.toMatch(/\bSaker\b/);
  });

  it('jobbdetalj har ikke egen tilbake-til-Min-dag på siden', () => {
    const detalj = utenKommentarer(les('../app/(app)/min-dag/[id]/page.tsx'));
    expect(detalj).not.toMatch(/← Min dag/);
    expect(detalj).toMatch(/Start/);
    expect(detalj).toMatch(/Fullført/);
    expect(detalj).not.toMatch(/['"]Ferdig['"]/);
    expect(detalj).toMatch(/jobbStatusKnapper|Stopp/);
  });
});

describe('Forhandler-info uten Grainient', () => {
  it('er en ren tittel, ikke kort eller Grainient', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/forhandler-info-kort.tsx'));
    expect(kort).toMatch(/data-forhandler-info/);
    expect(kort).not.toMatch(/Grainient|ShaderGradient/);
    expect(kort).toMatch(/<h1/);
    expect(kort).not.toMatch(/rounded-xl/);
    expect(kort).not.toMatch(/bg-card/);
  });

  it('kortfeltene er uendret', () => {
    expect(visKortFelt({ orgnr: ' 123 ', address: '', phone: '', website: '' })).toEqual([
      { label: 'Orgnr', verdi: '123' },
    ]);
    expect(
      visKortFelt({
        orgnr: '1',
        email: 'post@verksted.no',
        leftover: { guid: 'cli-1', tom: '' },
      }),
    ).toEqual([
      { label: 'Orgnr', verdi: '1' },
      { label: 'E-post', verdi: 'post@verksted.no' },
      { label: 'guid', verdi: 'cli-1' },
    ]);
    expect(formatLeftoverVerdi('  ')).toBeNull();
    expect(adresseLinje({ address: 'Gate 1', postalCode: '0150', city: 'Oslo' })).toBe(
      'Gate 1, 0150 Oslo',
    );
    expect(kjoretoyIkon('mc')).toBe('mc');
    expect(kjoretoyIkon('atv')).toBe('atv');
    expect(kjoretoyIkon('boat')).toBe('boat');
    expect(kjoretoyIkon('ukjent')).toBe('mc');
  });

  it('kortet sitter på mekaniker- og innboks-hjem — ikke over Verkstedet-hero', () => {
    const dealer = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const mek = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    const innboks = utenKommentarer(les('../app/(app)/innboks/page.tsx'));
    expect(dealer).not.toMatch(/ForhandlerInfoKort/);
    expect(dealer).toMatch(/tenantName/);
    expect(dealer).toMatch(/navn=\{forhandlernavn\}/);
    expect(mek).toMatch(/ForhandlerInfoKort/);
    expect(dash).not.toMatch(/ForhandlerInfoKort/);
    expect(dash).toMatch(/DealerDestinasjonskort/);
    expect(dash).toMatch(/sr-only/);
    expect(dealer).toMatch(/variant="hero"/);
    expect(innboks).toMatch(/ForhandlerInfoKort/);
    expect(`${dealer}\n${mek}\n${dash}\n${innboks}`).not.toMatch(
      /Grainient|grainient|Galaxy|galaxy/,
    );
  });
});

describe('telefon-toppbar og sidebar-overlay', () => {
  it('ingen PhoneBevel — profil/logg ut bor i samme sidebar som desktop', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(layout).not.toMatch(/PhoneBevel/);
    expect(layout).toMatch(/overflow-y-auto/);
    expect(layout).toMatch(/<main className="[^"]*\bflex-1\b/);
    expect(layout).not.toMatch(/<main className="[^"]*\bmd:flex-1\b/);
    expect(shell).toMatch(/data-phone-top-bar/);
    expect(shell).toMatch(/fixed inset-x-0 top-0 z-\[60\]/);
    expect(PHONE_SHELL_ROT).toMatch(/min-h-dvh|h-dvh|flex-1/);
    expect(PHONE_SAFE_BUNN).toContain('safe-area-inset-bottom');
  });

  it('logo til venstre, åpne-sidebar-ikon ytterst til høyre, tilbake er history', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/PanelLeftOpen/);
    expect(shell).toMatch(/TilbakePil/);
    expect(shell).toMatch(/router\.back\(\)/);
    expect(shell).toMatch(/aria-label="Tilbake"/);
    expect(shell).not.toMatch(/ChevronLeft/);
  });
});

describe('Timeplan — piler, valgt dag først, måned, 08–20', () => {
  it('valgt dag er først, og stripen har 08–20', () => {
    const valgt = '2026-08-29';
    const dager = timeplanDagerFra(valgt);
    expect(dager).toHaveLength(3);
    expect(dager[0]?.ymd).toBe(valgt);
    expect(dager[1]?.ymd).toBe(osloPlusDager(valgt, 1));
    expect(dager[2]?.ymd).toBe(osloPlusDager(valgt, 2));
    expect(TIMEPLAN_DAG_START).toBe(8);
    expect(TIMEPLAN_DAG_SLUTT).toBe(20);
    expect(timeplanManedNavn(valgt)).toMatch(/august/i);
    expect(timeplanSkiftManed(valgt, 1)).toBe('2026-09-29');
    expect(timeplanSkiftManed('2026-01-31', 1)).toBe('2026-02-28');
    expect(timeplanSkiftManed('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('Timeplan-siden bruker piler og Oslo-døgn, ikke overflow-scroll', () => {
    const side = utenKommentarer(les('../app/(app)/min-dag/timeplan/page.tsx'));
    const stripe = utenKommentarer(les('../app/(app)/_shell/timeplan-stripe.tsx'));
    expect(side).toMatch(/TimeplanStripe|timeplanDagerFra/);
    expect(side).toMatch(/08:00|TIMEPLAN_DAG_START/);
    expect(stripe).toMatch(/aria-label="Forrige dag"/);
    expect(stripe).toMatch(/aria-label="Neste dag"/);
    expect(stripe).toMatch(/aria-label="Forrige måned"/);
    expect(stripe).toMatch(/aria-label="Neste måned"/);
    expect(stripe).toMatch(/timeplanManedNavn|capitalize/);
    expect(stripe).not.toMatch(/timeplanManeder\(/);
    expect(stripe).not.toMatch(/min-w-\[56px\]/);
    expect(stripe).not.toMatch(/overflow-hidden/);
    expect(stripe).not.toMatch(/overflow-x/);
    expect(side + stripe).not.toMatch(/overflow-x-auto/);
    expect(side).toMatch(/osloKalenderdag|osloVeggklokke|PRODUKT_TIDSSONE/);
  });
});

describe('Jobb starttid — dato og klokke som expandere', () => {
  it('Ny jobb har Date- og Time-knapper, ikke datetime-local', () => {
    const ny = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(ny).toMatch(/StarttidVelger|Dato|Klokke/);
    expect(ny).not.toMatch(/datetime-local/);
  });

  it('bygger Oslo-instant uten UTC-døgnskifte', () => {
    const iso = osloStartFraFelt('2026-08-29', 8, 0);
    expect(osloKalenderdag(iso)).toBe('2026-08-29');
    expect(tilOsloDato(iso)).toBe('2026-08-29');
    expect(tilOsloTime(iso)).toBe(8);
    expect(tilOsloMinutt(iso)).toBe(0);
    expect(osloVeggklokke('2026-08-29', 8, 0).toISOString()).toBe(iso);
  });
});

describe('mekaniker-hjem — fast 3-spors Dine jobber-kort', () => {
  it('reserverer alltid tre rader og viser maks tre jobber', () => {
    expect(HJEM_JOBBER_MAX).toBe(3);
    expect(hjemJobbSlots([]).length).toBe(3);
    expect(hjemJobbSlots(['a']).length).toBe(3);
    expect(hjemJobbSlots(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(hjemJobbSlots(['a'])[1]).toBeNull();
    expect(hjemJobbSlots(['a'])[2]).toBeNull();
    const kort = utenKommentarer(les('../app/(app)/dine-jobber/_hjem-kort.tsx'));
    expect(kort).toMatch(/h-\[148px\]/);
    expect(kort).toMatch(/Se alle jobber/);
    expect(kort).toMatch(/Ingen jobber i dag/);
    expect(kort).toMatch(/mechanic\.myDay/);
    const minDag = utenKommentarer(les('../app/(app)/min-dag/page.tsx'));
    expect(minDag).toMatch(/DineJobberHjemKort/);
    expect(minDag).not.toMatch(/DineJobberFlate/);
  });
});

describe('jobbstatus-knapper følger live status', () => {
  it('Start bare når planlagt, Stopp+Fullført når pågår, Fullført som status når completed', () => {
    expect(jobbStatusKnapper('confirmed')).toEqual({
      start: true,
      stopp: false,
      fullfortHandling: false,
      fullfortStatus: false,
    });
    expect(jobbStatusKnapper('in_progress')).toEqual({
      start: false,
      stopp: true,
      fullfortHandling: true,
      fullfortStatus: false,
    });
    expect(jobbStatusKnapper('completed')).toEqual({
      start: false,
      stopp: false,
      fullfortHandling: false,
      fullfortStatus: true,
    });
  });
});

describe('Ferie-mock i Innstillinger', () => {
  it('er merket som kommer/mock og vises på telefon + desktop', () => {
    expect(FERIE_MOCK.length).toBeGreaterThan(0);
    expect(FERIE_MOCK.every((r) => typeof r.dager === 'number')).toBe(true);
    const skall = utenKommentarer(les('../app/(app)/innstillinger/_skall.tsx'));
    const meg = utenKommentarer(les('../app/(app)/min-dag/meg/page.tsx'));
    const ferie = utenKommentarer(les('../app/(app)/_shell/ferie-mock.tsx'));
    expect(skall).toMatch(/FerieMock/);
    expect(meg).toMatch(/FerieMock/);
    expect(ferie).toMatch(/kommer|mock/i);
    expect(ferie).toMatch(/Ferie/);
    expect(ferie).not.toMatch(/resend|fetch\(|trpc\./);
  });
});
