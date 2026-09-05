import { execFileSync } from 'node:child_process';
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
  HJEM_SCROLL_FLATE,
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
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
const repo = resolve(her, '../../..');

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const CHROME_URORT = [
  'apps/web/app/(app)/_shell/phone-shell.tsx',
  'apps/web/app/(app)/_shell/sidebar.tsx',
  'apps/web/app/(app)/_shell/sidebar-header.tsx',
  'apps/web/app/(app)/_shell/seksjon-bar.tsx',
  'apps/web/app/(app)/_workshop/workshop-bloub.tsx',
  'apps/web/app/(app)/_shell/phone-home-mekaniker.tsx',
  'apps/web/app/(app)/layout.tsx',
  'apps/web/app/_markeds/markeds-chrome.tsx',
] as const;

describe('Jonas hard-fasit — forhandler-hjem Apple', () => {
  it('låser hero → Timeplan|Rapporter → Innboks|Jobber → Kunder|Organisasjon → Hjelp (hopp Samarbeid) → Lager', () => {
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
    expect(samarbeidSynligINav()).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.key === 'samarbeid')).toBe(false);
    expect(dealerPhoneHjemRader(false).map((r) => r.keys.join('|'))).toEqual([
      'verkstedet',
      'timeplan|statistikk',
      'innboks|jobber',
      'kunder|organisasjon',
      'hjelp',
      'lager',
    ]);
    expect(dealerPhoneHjemRader(true).at(-1)?.keys).toEqual(['lager', 'butikk']);
  });

  it('ingen hjem-kort for Book / Oppslag / AI / Kompetanse / Prisliste / Abonnement', () => {
    const keys = flatDealerHjemKeys(true);
    for (const forbudt of FORBUDT_DEALER_HJEM) {
      expect(keys).not.toContain(forbudt);
    }
    expect(keys).not.toContain('tjenester');
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
        pathname: '/organisasjon',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => f.label),
    ).toEqual(['Oversikt', 'Ansatte', 'Abonnement', 'Integrasjoner']);
  });

  it('HJEM_KORT_TOM er samme ærlig #136-kopi', () => {
    expect(HJEM_KORT_TOM).toEqual({
      hero: 'Ingen jobber i dag',
      timeplan: 'Ingen jobber i dag',
      innboks: 'Ingen uleste',
      jobber: 'Ingen åpne jobber',
      kunder: 'Ingen kunder ennå',
      organisasjon: 'Åpne organisasjon',
      rapporter: 'Ingen tall ennå',
      lager: 'Ingen lave varer',
      lagerTomt: 'Ingen deler ennå',
      hjelp: 'Artikler og support',
    });
    const naa = new Date('2026-08-29T10:00:00');
    expect(verkstedHeroTall([], naa)).toEqual({ idag: 0, paagaar: 0, fullfort: 0 });
    expect(jobberMeta([], naa)).toBe(HJEM_KORT_TOM.jobber);
    expect(innboksMeta([])).toEqual({ ulest: 0, linje: HJEM_KORT_TOM.innboks });
    expect(kunderMeta([])).toBe(HJEM_KORT_TOM.kunder);
    expect(organisasjonMeta([])).toBe(HJEM_KORT_TOM.organisasjon);
    expect(statistikkSetning([], naa)).toBe(HJEM_KORT_TOM.rapporter);
    expect(lagerMeta([], [])).toBe(HJEM_KORT_TOM.lager);
    expect(timeplanRader([], naa)).toEqual([]);
  });

  it('scroll-flate er parchment med overscroll-contain og bunn-safe, uten dobbel topp-safe', () => {
    expect(HJEM_SCROLL_FLATE).toMatch(/bg-bg/);
    expect(HJEM_SCROLL_FLATE).toMatch(/overscroll-y-contain|overscroll-none/);
    expect(HJEM_SCROLL_FLATE).toMatch(/safe-area-inset-bottom/);
    expect(HJEM_SCROLL_FLATE).not.toMatch(/safe-area-inset-top/);
    expect(HJEM_SCROLL_FLATE).not.toMatch(/#111|Grainient|Galaxy/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(hjem).toMatch(/HJEM_SCROLL_FLATE/);
    expect(dash).toMatch(/HJEM_SCROLL_FLATE/);
    expect(hjem).toMatch(/gap-5/);
    expect(hjem).not.toMatch(/PHONE_SAFE_TOP/);
  });

  it('hero er plate: radius 16, stor tittel, I dag/Pågår/Fullført, ikke #111', () => {
    expect(PHONE_HERO_FYLL).toMatch(/rounded-\[16px\]/);
    expect(PHONE_HERO_FYLL).toMatch(/bg-card/);
    expect(PHONE_HERO_FYLL).toMatch(/border-border/);
    expect(PHONE_HERO_FYLL).not.toMatch(/#111|bg-fg|Grainient|Galaxy/);
    expect(PHONE_DEST_FYLL).toMatch(/rounded-\[1[24]px\]/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    expect(hjem).toMatch(/I dag/);
    expect(hjem).toMatch(/Pågår/);
    expect(hjem).toMatch(/Fullført/);
    expect(hjem).toMatch(/variant="hero"/);
    expect(hjem).toMatch(/HJEM_KORT_TOM\.hero/);
    expect(hjem).toMatch(/data-hjem-seksjon=\{seksjon\}/);
    expect(hjem).toMatch(/seksjon === 'idag' \? 'I dag' : 'Mer'/);
    expect(kort).toMatch(/text-\[28px\]/);
    expect(kort).toMatch(/min-h-11/);
    expect(kort).toMatch(/touch-action:\s*manipulation|\[touch-action:manipulation\]/);
    expect(kort).not.toMatch(/Grainient|Galaxy|#111/);
  });

  it('kortlenker har touch-action manipulation; viewport tillater zoom', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    const rot = les('../app/layout.tsx');
    expect(kort).toMatch(/touch-action:\s*manipulation|\[touch-action:manipulation\]/);
    expect(rot).not.toMatch(/user-scalable\s*[:=]\s*['"]?no/);
    expect(rot).not.toMatch(/maximumScale:\s*1/);
    expect(rot).toMatch(/viewportFit:\s*['"]cover['"]/);
  });

  it('desktop er samme destinasjonskort — ikke KPI-dump', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(dash).toMatch(/DealerDestinasjonskort/);
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(dash).not.toMatch(/AnsattePaJobb/);
    expect(dash).not.toMatch(/Dagens saker/);
    expect(dash).not.toMatch(/Grainient|Galaxy|#111/);
  });

  it('chrome-filer er identiske med origin/main', () => {
    for (const fil of CHROME_URORT) {
      const main = execFileSync('git', ['show', `origin/main:${fil}`], {
        cwd: repo,
        encoding: 'utf8',
      });
      const naa = readFileSync(resolve(repo, fil), 'utf8');
      expect(naa, fil).toBe(main);
    }
  });

  it('speiler hard-fasit i docs/', () => {
    const hard = les('../../../docs/endwise-forhandler-hjem-apple-hard-fasit.md');
    const fasit = les('../../../docs/endwise-forhandler-hjem-apple-fasit.md');
    expect(hard).toMatch(/parchment `#f5f5f7`/);
    expect(hard).toMatch(/touch-action: manipulation/);
    expect(hard).toMatch(/Timeplan\|Rapporter/);
    expect(hard).toMatch(/Don’t touch PhoneShell/);
    expect(fasit).toMatch(/Timeplan \| Rapporter/);
    expect(fasit).toMatch(/Ikke Organisasjon-piller/);
    expect(fasit).toMatch(/hard-fasit/);
  });
});
