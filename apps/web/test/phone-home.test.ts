import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEALER_PHONE_HJEM,
  dealerPhoneHjemRader,
  erDealerPhoneHjem,
  erMekanikerPhoneHjem,
  FORBUDT_DEALER_HJEM,
  flatDealerHjemKeys,
  MEKANIKER_PHONE_HURTIG,
  mekanikerHurtigKort,
  PHONE_KORT_FYLL,
  PHONE_KORT_META,
  PHONE_SAFE_BUNN,
  PHONE_SAFE_TOP,
  PHONE_SHELL_ROT,
  phoneInnstillingerHref,
} from '../app/(app)/_shell/phone-home.ts';
import {
  innboksMeta,
  kunderMeta,
  lagerMeta,
  nesteJobb,
  organisasjonMeta,
  rapporterSetning,
  statistikkSetning,
  timeplanRader,
  verkstedHeroTall,
} from '../app/(app)/_shell/phone-home-data.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('dealer phone home — kortrekkefølge og fyll', () => {
  it('låser hero → Innboks|Timeplan → Statistikk|Tjenester → Kunder|Organisasjon → Samarbeid|Hjelp → Lager lavt', () => {
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual([
      ['verkstedet'],
      ['innboks', 'timeplan'],
      ['statistikk', 'tjenester'],
      ['kunder', 'organisasjon'],
      ['samarbeid', 'hjelp'],
      ['lager'],
    ]);
    expect(DEALER_PHONE_HJEM[0]?.kind).toBe('hero');
    expect(DEALER_PHONE_HJEM[1]?.kind).toBe('pair');
    expect(DEALER_PHONE_HJEM[2]?.kind).toBe('pair');
    expect(DEALER_PHONE_HJEM.at(-1)?.kind).toBe('low');
  });

  it('Innboks|Timeplan og Tjenester er høyt, Lager er lavt', () => {
    const keys = DEALER_PHONE_HJEM.map((r) => r.keys.join('|'));
    expect(keys.indexOf('innboks|timeplan')).toBeLessThan(keys.indexOf('statistikk|tjenester'));
    expect(keys.indexOf('statistikk|tjenester')).toBeLessThan(keys.indexOf('lager'));
    expect(keys.indexOf('innboks|timeplan')).toBeLessThan(keys.indexOf('lager'));
    expect(keys.at(-1)).toBe('lager');
  });

  it('Butikk står ved Lager bare når shop-flagget er på', () => {
    expect(dealerPhoneHjemRader(false).at(-1)?.keys).toEqual(['lager']);
    expect(dealerPhoneHjemRader(true).at(-1)?.keys).toEqual(['lager', 'butikk']);
  });

  it('ingen hjem-kort for Book, Oppslag, AI, Kompetanse, Prisliste, Abonnement', () => {
    const keys = flatDealerHjemKeys(true);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(keys).not.toContain(forbudt);
    }
    expect(keys).not.toContain('kompetanse');
    const labels = keys.map((k) => PHONE_KORT_META[k].label.toLowerCase());
    expect(labels.some((l) => /book|oppslag|prisliste|abonnement|\bai\b/.test(l))).toBe(false);
  });

  it('Timeplan går til /jobber, Tjenester til /prisliste, Statistikk til /rapporter', () => {
    expect(PHONE_KORT_META.timeplan.href).toBe('/jobber');
    expect(PHONE_KORT_META.tjenester.href).toBe('/prisliste');
    expect(PHONE_KORT_META.statistikk.href).toBe('/rapporter');
    expect(PHONE_KORT_META.verkstedet.href).toContain('visning=dag');
  });

  it('Verkstedet-hero har I dag, Pågår og Fullført — ikke en jobbliste', () => {
    const naa = new Date('2026-08-29T10:00:00');
    const tall = verkstedHeroTall(
      [
        { id: '1', status: 'confirmed', startsAt: '2026-08-29T08:00:00', serviceName: 'EU' },
        { id: '2', status: 'in_progress', startsAt: '2026-08-29T09:00:00', serviceName: 'Olje' },
        { id: '3', status: 'completed', startsAt: '2026-08-29T07:00:00', serviceName: 'Dekk' },
        { id: '4', status: 'confirmed', startsAt: '2026-08-30T08:00:00', serviceName: 'I morgen' },
      ],
      naa,
    );
    expect(tall).toEqual({ idag: 3, paagaar: 1, fullfort: 1 });
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/I dag/);
    expect(hjem).toMatch(/Pågår/);
    expect(hjem).toMatch(/Fullført/);
    expect(hjem).not.toMatch(/jobb-liste|Dagens saker/);
  });

  it('Timeplan-kortet er destinasjon uten jobbliste eller Ny jobb', () => {
    const naa = new Date('2026-08-29T06:00:00');
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
          status: 'confirmed',
          startsAt: '2026-08-29T10:00:00',
          serviceName: 'Olje',
          regNumber: 'EV99999',
        },
      ],
      naa,
      4,
    );
    expect(rader).toHaveLength(2);
    expect(rader[0]?.what).toMatch(/EU-kontroll/);
    expect(rader[0]?.time).toMatch(/\d/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/Ingen jobber i dag/);
    expect(hjem).not.toMatch(/Ny jobb/);
    expect(hjem).not.toMatch(/bookinger\/ny/);
    expect(hjem).toMatch(/key === 'timeplan'/);
  });

  it('fyller statistikk, innboks, kunder, org, lager og rapporter-setning fra ekte/eksisterende tall', () => {
    const naa = new Date('2026-08-26T12:00:00');
    const uke = [
      { id: '1', status: 'completed', startsAt: '2026-08-24T08:00:00', serviceName: 'EU' },
      { id: '2', status: 'confirmed', startsAt: '2026-08-26T09:00:00', serviceName: 'Olje' },
    ];
    expect(statistikkSetning(uke, naa)).toMatch(/2 jobber/);
    expect(statistikkSetning(uke, naa)).toMatch(/1 fullført/);
    expect(rapporterSetning()).toMatch(/7 dager/);
    expect(innboksMeta([{ subject: 'Bremse', unread: 2, lastMessageAt: naa }])).toEqual({
      ulest: 2,
      linje: 'Bremse',
    });
    expect(
      kunderMeta([
        { name: 'Kari', createdAt: '2026-08-20' },
        { name: 'Ola', createdAt: '2026-08-25' },
      ]),
    ).toMatch(/Ola · 2 totalt/);
    expect(organisasjonMeta([{ status: 'på_jobb' }, { status: 'fri' }])).toBe('1 på jobb');
    expect(lagerMeta([{ name: 'Olje filter', sku: 'OF-1', tilgjengelig: 1 }], [])).toMatch(
      /Olje filter/,
    );
    expect(nesteJobb(uke, naa)?.what).toMatch(/Olje/);
  });

  it('kort bruker appens flate/tekst-tokens — ikke shadcn accent (vasket hvit-på-grå)', () => {
    expect(PHONE_KORT_FYLL).toMatch(/rounded-xl/);
    expect(PHONE_KORT_FYLL).toMatch(/bg-card/);
    expect(PHONE_KORT_FYLL).toMatch(/text-fg/);
    expect(PHONE_KORT_FYLL).toMatch(/border-border/);
    expect(PHONE_KORT_FYLL).not.toMatch(/bg-accent(?!-|soft|strong|dim|fg)/);
    expect(PHONE_KORT_FYLL).not.toMatch(/text-accent-fg/);
    expect(PHONE_KORT_FYLL).not.toMatch(/bg-white|bg-accent-fg/);
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    expect(kort).toMatch(/text-title/);
    expect(kort).toMatch(/text-\[12px\]/);
    expect(kort).toMatch(/text-fg-muted/);
    expect(kort).not.toMatch(/text-accent-fg/);
    expect(kort).not.toMatch(/variant="outline"|outline-card/);
    expect(kort).not.toMatch(/NewBadge|variant="destructive"/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/text-accent-fg|bg-accent-fg/);
    const mek = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    expect(mek).not.toMatch(/text-accent-fg|bg-accent-fg/);
  });
});

describe('phone shell — safe-area, høyde, ingen gammel chrome', () => {
  it('rot bruker dvh/svh, ikke rå 100vh / h-screen', () => {
    expect(PHONE_SHELL_ROT).toMatch(/h-dvh/);
    expect(PHONE_SHELL_ROT).toMatch(/min-h-svh/);
    expect(PHONE_SHELL_ROT).not.toMatch(/h-screen|100vh/);
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(layout).toMatch(/PHONE_SHELL_ROT/);
    expect(layout).not.toMatch(/h-screen/);
    expect(layout).not.toMatch(/100vh/);
    expect(PHONE_SHELL_ROT).toMatch(/min-h-svh/);
  });

  it('safe-area-inset-top over logo, safe-area-inset-bottom under bevel', () => {
    expect(PHONE_SAFE_TOP).toContain('safe-area-inset-top');
    expect(PHONE_SAFE_BUNN).toContain('safe-area-inset-bottom');
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/PHONE_SAFE_TOP/);
    expect(shell).toMatch(/PHONE_SAFE_BUNN/);
    expect(shell).toMatch(/logo\/logo\.svg/);
    expect(shell).toMatch(/logo-invert/);
    expect(shell).toMatch(/bg-bg/);
    expect(shell).not.toMatch(/bg-white/);
    expect(shell).toMatch(/BrukerRad|Logg ut/);
    expect(shell).toMatch(/innstillingerHref|phoneInnstillingerHref/);
    expect(shell).not.toMatch(/rolle \?\?/);
    expect(PHONE_SHELL_ROT).toMatch(/bg-bg/);
    expect(PHONE_SHELL_ROT).toMatch(/text-fg/);
    expect(PHONE_SHELL_ROT).not.toMatch(/bg-white/);
  });

  it('bevel-raden har Innstillinger-ikon på samme linje som avatar og logg ut', () => {
    expect(phoneInnstillingerHref('forhandler')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('endwise')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('endwise_partner')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('mekaniker')).toBe('/min-dag/meg');
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(rad).toMatch(/innstillingerHref/);
    expect(rad).toMatch(/Settings/);
    expect(rad).toMatch(/Innstillinger/);
    expect(rad).toMatch(/LogOut/);
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).not.toMatch(/innstillingerHref/);
  });

  it('ingen bunnbar, hamburger, horisontal hovedscroller, Mer-sheet eller visningsvelger', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(layout).not.toMatch(/PhoneNav/);
    expect(layout).toMatch(/PhoneShell/);
    expect(shell).not.toMatch(/hamburger|Menu\b|Sheet|visningsvelger|Kontor|Gulvet/i);
    expect(shell).not.toMatch(/PhoneHScroll|overflow-x-auto/);
    expect(hjem).not.toMatch(/hamburger|bottom-nav|grid-cols-5/);
    expect(layout).not.toMatch(/MobileShell/);
    expect(shell).not.toMatch(/grid-cols-5/);
  });

  it('svart logo.svg inverteres til hvit i mørkt tema, uten hvit sidebakgrunn', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    expect(tema).toMatch(
      /\[data-theme=["']dark["']\]\s*\.logo-invert\s*\{[^}]*filter:\s*brightness\(0\)\s+invert\(1\)/,
    );
    expect(PHONE_SHELL_ROT).toMatch(/bg-bg/);
    expect(PHONE_SHELL_ROT).not.toMatch(/bg-white/);
  });

  it('viewport-fit cover slik Chrome får ekte safe-area', () => {
    const rot = les('../app/layout.tsx');
    expect(rot).toMatch(/viewportFit:\s*['"]cover['"]/);
  });
});

describe('mekaniker phone home — Dine jobber, ikke Min dag', () => {
  it('hurtigkort er Dine jobber, Lager, Kompetanse, Timeplan, Hjelp — Butikk ved flagg', () => {
    expect(MEKANIKER_PHONE_HURTIG).toEqual([
      'dine-jobber',
      'lager',
      'kompetanse',
      'timeplan',
      'hjelp',
    ]);
    expect(mekanikerHurtigKort(true)).toEqual([
      'dine-jobber',
      'lager',
      'kompetanse',
      'timeplan',
      'hjelp',
      'butikk',
    ]);
    expect(mekanikerHurtigKort(false)).not.toContain('butikk');
  });

  it('ingen Min dag-hero eller Detaljer-accordion — Grainient + destinasjonskort', () => {
    const side = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    expect(side).not.toMatch(/Min dag/);
    expect(side).not.toMatch(/Detaljer/);
    expect(side).not.toMatch(/accordion|aria-expanded/);
    expect(side).toMatch(/ForhandlerGrainientKort/);
    expect(side).toMatch(/PhoneKort/);
    expect(side).not.toMatch(/swipe|clock-ring|tidslinje|time-axis/i);
  });

  it('Dine jobber går til /dine-jobber, ikke accordion mot /min-dag/[id] på hjem', () => {
    const side = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    expect(side).not.toMatch(/href=\{`\/min-dag\/\$\{/);
    expect(PHONE_KORT_META['dine-jobber']?.href).toBe('/dine-jobber');
    expect(PHONE_KORT_META['dine-jobber']?.label).toBe('Dine jobber');
  });
});

describe('desktop sidebar er urørt', () => {
  it('sidebar er hidden md:flex med Handlinger og BrukerRad', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/hidden[\s\S]*md:flex/);
    expect(sidebar).toMatch(/Handlinger/);
    expect(sidebar).toMatch(/BrukerRad/);
    expect(sidebar).toMatch(/min-width:\s*768px/);
    expect(sidebar).toMatch(/QUICK_ACTIONS/);
  });

  it('dealer desktop Verkstedet er uendret bak md:hidden-skillet', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(dash).toMatch(/hidden md:block|md:hidden/);
    expect(dash).toMatch(/Dagens saker|AnsattePaJobb|Timeplan/);
  });

  it('dashboard og /verkstedet wrapper useSearchParams i Suspense (next build)', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    const alias = les('../app/(app)/verkstedet/page.tsx');
    expect(dash).toMatch(/useSearchParams/);
    expect(dash).toMatch(/<Suspense[\s\S]*VerkstedetPageInner/);
    expect(dash).toMatch(/export default function VerkstedetPage/);
    expect(alias).toMatch(/from ['"]\.\.\/dashboard\/page['"]/);
  });
});

describe('Verkstedet-dag og Organisasjon på telefon', () => {
  it('dag-flaten har tilbake til kort-hjem, jobbkort, Book for kunde og Kalender', () => {
    const dag = utenKommentarer(les('../app/(app)/dashboard/_verkstedet-dag.tsx'));
    expect(dag).toMatch(/Book for kunde/);
    expect(dag).toMatch(/Ny jobb/);
    expect(dag).toMatch(/Kalender/);
    expect(dag).not.toMatch(/>Timeplan</);
    expect(dag).toMatch(/bookinger\/\$\{|bookinger\//);
    expect(erDealerPhoneHjem('/dashboard', '')).toBe(true);
    expect(erDealerPhoneHjem('/dashboard', 'visning=dag')).toBe(false);
    expect(erMekanikerPhoneHjem('/min-dag')).toBe(true);
    expect(erMekanikerPhoneHjem('/min-dag/kompetanse')).toBe(false);
  });

  it('Book for kunde sitter ikke på kort-hjem', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/Book for kunde/);
  });

  it('Organisasjon-piller wrapper på telefon og skjuler Abonnement/Integrasjoner for selger', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(seksjon).toMatch(/flex-wrap/);
    expect(seksjon).toMatch(/p\.roles/);
  });
});
