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
  it('låser pulse Planlagt · Analyser · Innboks · Lager · ansatte + Jobb', () => {
    expect(DEALER_PHONE_HJEM.map((r) => r.keys)).toEqual([
      ['idag'],
      ['innboks'],
      ['lager'],
      ['team', 'jobb'],
      ['analyser'],
    ]);
    expect(DEALER_PHONE_HJEM[0]?.kind).toBe('hero');
    expect(dealerPhoneHjemRader(false).flatMap((r) => r.keys)).not.toContain('samarbeid');
    expect(PHONE_KORT_META).toHaveProperty('samarbeid');
  });

  it('Lager kommer etter Innboks, Analyser er sist — ikke Svarhastighet/Timeplan', () => {
    const keys = DEALER_PHONE_HJEM.map((r) => r.keys.join('|'));
    expect(keys.indexOf('innboks')).toBeLessThan(keys.indexOf('lager'));
    expect(keys.indexOf('lager')).toBeLessThan(keys.indexOf('team|jobb'));
    expect(keys.indexOf('team|jobb')).toBeLessThan(keys.indexOf('analyser'));
    expect(keys.at(-1)).toBe('analyser');
    expect(keys).not.toContain('svarhastighet');
    expect(keys).not.toContain('timeplan');
  });

  it('Butikk er ikke et pulse-kort, uansett shop-flagg', () => {
    expect(dealerPhoneHjemRader(false).flatMap((r) => r.keys)).not.toContain('butikk');
    expect(dealerPhoneHjemRader(true).flatMap((r) => r.keys)).not.toContain('butikk');
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

  it('Timeplan går til kalender, Jobber til liste, Rapporter til /rapporter', () => {
    expect(PHONE_KORT_META.timeplan.href).toBe('/jobber?visning=kalender');
    expect(PHONE_KORT_META.jobber.label).toBe('Jobber');
    expect(PHONE_KORT_META.jobber.href).toBe('/jobber');
    expect(PHONE_KORT_META.tjenester.label).toBe('Tjenester');
    expect(PHONE_KORT_META.tjenester.href).toBe('/prisliste');
    expect(PHONE_KORT_META.statistikk.label).toBe('Rapporter');
    expect(PHONE_KORT_META.statistikk.href).toBe('/rapporter');
    expect(PHONE_KORT_META.verkstedet.href).toContain('visning=dag');
  });

  it('I dag-kortet har Planlagt, Pågår og Ferdig — ikke en jobbliste', () => {
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
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(hjem).toMatch(/PulseHeroFlate/);
    expect(kort).toMatch(/Planlagt/);
    expect(kort).toMatch(/Pågår/);
    expect(kort).toMatch(/Ferdig/);
    expect(hjem).not.toMatch(/jobb-liste|Dagens saker/);
  });

  it('Timeplan-gulv er borte; + Jobb åpner ny jobb', () => {
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
    expect(hjem).toMatch(/PulseJobbFlis|bookinger\/ny/);
    expect(hjem).not.toMatch(/Timeplan-gulv|nesteTreJobber/);
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
    expect(innboksMeta([])).toEqual({ ulest: 0, linje: 'Ingen uleste' });
    expect(
      kunderMeta([
        { name: 'Kari', createdAt: '2026-08-20' },
        { name: 'Ola', createdAt: '2026-08-25' },
      ]),
    ).toMatch(/Ola · 2 totalt/);
    expect(organisasjonMeta([{ status: 'på_jobb' }, { status: 'fri' }])).toBe('1 på jobb');
    expect(organisasjonMeta([])).toBe('Åpne organisasjon');
    expect(lagerMeta([], [])).toBe('Ingen lave varer');
    expect(lagerMeta([{ name: 'Olje filter', sku: 'OF-1', tilgjengelig: 1 }], [])).toMatch(
      /Olje filter/,
    );
    expect(nesteJobb(uke, naa)?.what).toMatch(/Olje/);
  });

  it('kort bruker appens flate/tekst-tokens — ikke shadcn accent (vasket hvit-på-grå)', () => {
    expect(PHONE_KORT_FYLL).toMatch(/rounded-\[24px\]/);
    expect(PHONE_KORT_FYLL).toMatch(/bg-card/);
    expect(PHONE_KORT_FYLL).toMatch(/text-fg/);
    expect(PHONE_KORT_FYLL).toMatch(/border-divide/);
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

  it('safe-area-inset-top over to toppbarer; sidebar er skjult på telefon', () => {
    expect(PHONE_SAFE_TOP).toContain('safe-area-inset-top');
    expect(PHONE_SAFE_BUNN).toContain('safe-area-inset-bottom');
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(shell).toMatch(/PHONE_SAFE_TOP/);
    expect(shell).not.toMatch(/PHONE_SAFE_BUNN/);
    expect(shell).toMatch(/logo\/logo\.svg/);
    expect(shell).toMatch(/bg-fg/);
    expect(shell).toMatch(/maskImage|WebkitMaskImage|mask-image/);
    expect(shell).not.toMatch(/logo-invert/);
    expect(shell).toMatch(/bg-bg/);
    expect(shell).not.toMatch(/bg-white/);
    expect(shell).not.toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/data-phone-search/);
    expect(shell).toMatch(/data-phone-profile/);
    expect(shell).not.toMatch(/BrukerRad/);
    expect(shell).not.toMatch(/rolle \?\?/);
    expect(sidebar).toMatch(/hidden/);
    expect(sidebar).toMatch(/md:flex/);
    expect(PHONE_SHELL_ROT).toMatch(/bg-bg/);
    expect(PHONE_SHELL_ROT).toMatch(/text-fg/);
    expect(PHONE_SHELL_ROT).not.toMatch(/bg-white/);
  });

  it('profil og logg ut bor i sidebaren, ikke i telefon-bevel', () => {
    expect(phoneInnstillingerHref('forhandler')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('endwise')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('endwise_partner')).toBe('/innstillinger/profil');
    expect(phoneInnstillingerHref('mekaniker')).toBe('/min-dag/meg');
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(rad).toMatch(/innstillingerHref/);
    expect(rad).toMatch(/Settings/);
    expect(rad).toMatch(/Profil|Innstillinger/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).not.toMatch(/BEVEL|Avatar|variant === 'phone'/);
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/innstillingerHref/);
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(layout).not.toMatch(/PhoneBevel/);
  });

  it('ingen bunnbar, hamburger, Mer-sheet eller visningsvelger — dest-piller i top-bar 2', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(layout).not.toMatch(/PhoneNav/);
    expect(layout).toMatch(/PhoneShell/);
    expect(shell).not.toMatch(/hamburger|\bMenu\b|visningsvelger|Kontor|Gulvet/i);
    expect(shell).not.toMatch(/<Sheet|PhoneNav|Mer-sheet/);
    expect(shell).toMatch(/PhoneHScroll/);
    expect(hjem).not.toMatch(/hamburger|bottom-nav|grid-cols-5/);
    expect(layout).not.toMatch(/MobileShell/);
    expect(shell).not.toMatch(/grid-cols-5/);
  });

  it('svart logo.svg inverteres til hvit i mørkt tema, uten hvit sidebakgrunn', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    expect(tema).toMatch(/\.logo-invert[\s\S]{0,80}filter:\s*brightness\(0\)\s+invert\(1\)/);
    expect(PHONE_SHELL_ROT).toMatch(/bg-bg/);
    expect(PHONE_SHELL_ROT).not.toMatch(/bg-white/);
  });

  it('viewport-fit cover slik Chrome får ekte safe-area', () => {
    const rot = les('../app/layout.tsx');
    expect(rot).toMatch(/viewportFit:\s*['"]cover['"]/);
  });
});

describe('mekaniker phone home — Dine jobber, ikke Min dag', () => {
  it('hurtigkort er Kompetanse, Timeplan, Hjelp — Butikk ved flagg, uten Dine jobber/Lager', () => {
    expect(MEKANIKER_PHONE_HURTIG).toEqual(['kompetanse', 'timeplan', 'hjelp']);
    expect(mekanikerHurtigKort(true)).toEqual(['kompetanse', 'timeplan', 'hjelp', 'butikk']);
    expect(mekanikerHurtigKort(false)).not.toContain('butikk');
    expect(mekanikerHurtigKort(false)).not.toContain('dine-jobber');
    expect(mekanikerHurtigKort(false)).not.toContain('lager');
  });

  it('ingen Min dag-hero eller Detaljer-accordion — forhandler-info + stort kort + Lager', () => {
    const side = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    expect(side).not.toMatch(/Min dag/);
    expect(side).not.toMatch(/Detaljer/);
    expect(side).not.toMatch(/accordion|aria-expanded/);
    expect(side).toMatch(/ForhandlerInfoKort/);
    expect(side).toMatch(/DineJobberHjemKort/);
    expect(side).toMatch(/PhoneKort/);
    expect(side).not.toMatch(/swipe|clock-ring|tidslinje|time-axis/i);
  });

  it('rader går til /min-dag/[id], Se alle til /dine-jobber — ikke accordion', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-mekaniker.tsx'));
    const kort = utenKommentarer(les('../app/(app)/dine-jobber/_hjem-kort.tsx'));
    const rad = utenKommentarer(les('../app/(app)/dine-jobber/_rad.tsx'));
    expect(hjem).not.toMatch(/accordion|aria-expanded/);
    expect(kort).toMatch(/Se alle jobber/);
    expect(kort).toMatch(/\/dine-jobber/);
    expect(rad).toMatch(/\/min-dag\/\$\{/);
    expect(PHONE_KORT_META['dine-jobber']?.href).toBe('/dine-jobber');
    expect(PHONE_KORT_META['dine-jobber']?.label).toBe('Dine jobber');
  });
});

describe('desktop sidebar er persistent rail, skjult på telefon', () => {
  it('sidebar er hidden under md og fast skinne på md+', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/data-phone-sidebar="closed"/);
    expect(sidebar).not.toMatch(/fixed inset-x-0 bottom-0/);
    expect(sidebar).not.toMatch(/top-\[calc\(env\(safe-area-inset-top\)\+var\(--ew-row-h\)\)\]/);
    expect(sidebar).not.toMatch(/fixed inset-0/);
    expect(sidebar).toMatch(/hidden/);
    expect(sidebar).toMatch(/md:flex/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(sidebar).not.toMatch(/phoneOpen/);
    expect(sidebar).not.toMatch(/Handlinger/);
    expect(sidebar).toMatch(/BrukerRad/);
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/QUICK_ACTIONS/);
  });

  it('dealer desktop Verkstedet er samme destinasjonskort bak md-skillet', () => {
    const dash = utenKommentarer(les('../app/(app)/home/page.tsx'));
    expect(dash).toMatch(/useMdViewport/);
    expect(dash).toMatch(/flate === ['"]desktop['"]/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(dash).toMatch(/DealerPulseKort|DealerDestinasjonskort/);
    expect(dash).not.toMatch(/AnsattePaJobb/);
  });

  it('/home og /verkstedet wrapper useSearchParams i Suspense; /dashboard redirecter', () => {
    const hjem = utenKommentarer(les('../app/(app)/home/page.tsx'));
    const alias = les('../app/(app)/verkstedet/page.tsx');
    const gammel = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(hjem).toMatch(/useSearchParams/);
    expect(hjem).toMatch(/<Suspense[\s\S]*VerkstedetPageInner/);
    expect(hjem).toMatch(/export default function VerkstedetPage/);
    expect(alias).toMatch(/from ['"]\.\.\/home\/page['"]/);
    expect(gammel).toMatch(/redirect\(/);
    expect(gammel).toMatch(/\/home/);
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
    expect(erDealerPhoneHjem('/home', '')).toBe(true);
    expect(erDealerPhoneHjem('/dashboard', '')).toBe(true);
    expect(erDealerPhoneHjem('/home', 'visning=dag')).toBe(false);
    expect(erDealerPhoneHjem('/dashboard', 'visning=dag')).toBe(false);
    expect(erMekanikerPhoneHjem('/min-dag')).toBe(true);
    expect(erMekanikerPhoneHjem('/min-dag/kompetanse')).toBe(false);
  });

  it('Book for kunde sitter ikke på kort-hjem', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/Book for kunde/);
  });

  it('hero-tittel er forhandlernavn, ikke Verkstedet, uten ForhandlerInfoKort over', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(hjem).not.toMatch(/ForhandlerInfoKort/);
    expect(kort).toMatch(/Planlagt/);
    expect(hjem).toMatch(/visning=dag|PHONE_KORT_META\.idag/);
  });

  it('Organisasjon-piller wrapper på telefon og skjuler Abonnement/Integrasjoner for selger', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const faner = utenKommentarer(les('../app/(app)/_shell/seksjon-faner.ts'));
    expect(seksjon).toMatch(/flex-wrap/);
    expect(faner).toMatch(/pillsForRole/);
  });
});
