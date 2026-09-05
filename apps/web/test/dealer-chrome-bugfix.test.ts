import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  effektivPlanNokkel,
  nesteTier,
  oppgraderKnappetekst,
  visOppgraderCta,
} from '@endwise/modules/billing/plans';
import { describe, expect, it } from 'vitest';
import {
  statistikkSetning,
  timeplanMeta,
  tjenesterMeta,
} from '../app/(app)/_shell/phone-home-data.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Ronny-stripe — lukket/peek er full skallbredde', () => {
  it('lukket skall er w-full uten Verksted-kort-max-width', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const lukket = fab.slice(0, fab.indexOf('data-ronny-flate'));
    expect(lukket).toMatch(/data-ronny-skall-bredde[\s\S]{0,80}className="w-full"/);
    expect(lukket).toMatch(/LUKKET_SKALL = 'w-full overflow-hidden shadow-none'/);
    expect(lukket).not.toMatch(/data-ronny-verksted-bredde/);
    expect(lukket).not.toMatch(/VERKSTED_INNHOLD/);
    expect(lukket).not.toMatch(/max-w-\[520px\]/);
    expect(lukket).not.toMatch(/md:max-w-\[1120px\]/);
  });

  it('full-åpen stripe er fortsatt viewport-bredde (left-0 right-0)', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(fab).toMatch(/fixed right-0 bottom-0 left-0/);
  });
});

describe('Sidebar-toggle ytterst til høyre', () => {
  it('toppbar-raden er justify-between — logo venstre, toggle høyre', () => {
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    expect(chrome).toMatch(
      /SHELL_HEADER_RAD = 'flex h-row w-full items-center justify-between gap-2 px-3'/,
    );
  });

  it('telefon: logo(+tilbake) i venstregruppe, åpne-ikon sist', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-sidebar-open/);
    const logo = shell.indexOf('data-shell-logo');
    const toggle = shell.indexOf('data-phone-sidebar-open');
    expect(logo).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(logo);
  });

  it('sidebar-header: logo først, minimer sist — ikke klistret mot logo uten spacer', () => {
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    expect(header).toMatch(/justify-between/);
    expect(header).not.toMatch(/rett ved logoen/);
  });
});

describe('Oppgrader-CTA følger faktisk nivå', () => {
  it('billing-plan vinner, ellers tenants.plan', () => {
    expect(effektivPlanNokkel(null, 'enterprise')).toBe('enterprise');
    expect(effektivPlanNokkel('pro', 'enterprise')).toBe('pro');
    expect(effektivPlanNokkel(null, null)).toBeNull();
    expect(effektivPlanNokkel('ukjent', 'start')).toBe('start');
  });

  it('neste steg og knappetekst per nivå, uten priser', () => {
    expect(nesteTier('start')?.key).toBe('pro');
    expect(oppgraderKnappetekst('start')).toBe('Oppgrader til Pro');
    expect(oppgraderKnappetekst('pro')).toBe('Oppgrader til Enterprise');
    expect(oppgraderKnappetekst('enterprise')).toBe('Enterprise');
    expect(visOppgraderCta('enterprise')).toBe(false);
    expect(visOppgraderCta('pro')).toBe(true);
    expect(visOppgraderCta(null)).toBe(true);
    expect(oppgraderKnappetekst('enterprise')).not.toMatch(/Oppgrader/);
  });

  it('pillen er Galaxy-CTA under Enterprise og merke uten CTA på Enterprise', () => {
    const pille = utenKommentarer(les('../app/(app)/_shell/oppgrader-pille.tsx'));
    expect(pille).toMatch(/visOppgraderCta/);
    expect(pille).toMatch(/effektivPlanNokkel|planKey/);
    expect(pille).toMatch(/data-plan-badge/);
    expect(pille).toMatch(/<Galaxy/);
  });

  it('getState faller tilbake til tenants.plan', () => {
    const billing = les('../../../packages/modules/src/billing/index.ts');
    expect(billing).toMatch(/effektivPlanNokkel/);
    expect(billing).toMatch(/schema\.tenants\.plan/);
  });
});

describe('Tilbake er bare pil-SVG', () => {
  it('TilbakePil er SVG uten ordet Tilbake', () => {
    const pil = utenKommentarer(les('../app/(app)/_shell/tilbake-pil.tsx'));
    expect(pil).toMatch(/<svg/);
    expect(pil).toMatch(/viewBox="0 0 24 24"/);
    expect(pil).not.toMatch(/>Tilbake</);
    expect(pil).not.toMatch(/from ['"]@endwise\/ui['"]/);
    expect(pil).not.toMatch(/lucide|ChevronLeft/);
  });

  it('telefon-toppbar og tråd-chrome bruker TilbakePil uten synlig Tilbake-tekst', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(shell).toMatch(/<TilbakePil/);
    expect(shell).toMatch(/aria-label="Tilbake"/);
    expect(shell).not.toMatch(/>Tilbake</);
    expect(seksjon).toMatch(/<TilbakePil/);
    expect(seksjon).not.toMatch(/>Tilbake</);
  });
});

describe('Hjem-kort fylles fra eksisterende API-er', () => {
  it('Timeplan og Tjenester har ærlig sammendrag eller tomtilstand', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(
      timeplanMeta(
        [
          {
            id: '1',
            status: 'confirmed',
            startsAt: '2026-08-29T13:00:00',
            serviceName: 'EU-kontroll',
            regNumber: 'EL12345',
          },
        ],
        naa,
      ),
    ).toMatch(/EU-kontroll|13|1 i dag/);
    expect(timeplanMeta([], naa)).toBe('Ingen jobber i dag');
    expect(statistikkSetning([], naa)).toBe('Ingen tall ennå');
    expect(tjenesterMeta([])).toBe('Ingen tjenester ennå');
    expect(tjenesterMeta([{ name: 'EU-kontroll', active: true, priceMinor: 149000 }])).toMatch(
      /EU-kontroll/,
    );
    expect(tjenesterMeta([{ name: 'EU-kontroll', active: true, priceMinor: 149000 }])).toMatch(
      /kr/,
    );
  });

  it('dealer-hjem mapper timeplan/jobber og viser designet tomtilstand', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    expect(hjem).toMatch(/timeplanRader/);
    expect(hjem).toMatch(/jobberMeta/);
    expect(hjem).not.toMatch(/tjenesterMeta/);
    expect(hjem).not.toMatch(/key === 'timeplan'\) return \{\}/);
    expect(kort).toMatch(/data-phone-kort-meta|Ingen data/);
  });

  it('desktop Verkstedet viser samme destinasjonskort-fyll', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(dash).toMatch(/DealerDestinasjonskort|PhoneHomeDealer|timeplanMeta/);
  });
});
