import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  FORHANDLER_NAV,
  isItemActive,
  MEKANIKER_NAV,
  ORGANISASJON_SEKSJONER,
  PARKED_LABEL,
  pillsForRole,
} from '../app/(app)/_shell/nav.ts';
import { DEALER_PHONE_HJEM, PHONE_KORT_META } from '../app/(app)/_shell/phone-home.ts';
import { parseOrgSeksjon } from '../app/(app)/organisasjon/_seksjoner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael 29.08 — Timeplan + Tjenester + widget uten «feil»', () => {
  it('telefon-hjem: hero → Innboks|Timeplan → Statistikk|Tjenester → resten, Lager lavt', () => {
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
    expect(DEALER_PHONE_HJEM.at(-1)?.kind).toBe('low');
    expect(PHONE_KORT_META.timeplan.label).toBe('Timeplan');
    expect(PHONE_KORT_META.timeplan.href).toBe('/jobber');
    expect(PHONE_KORT_META.tjenester.label).toBe('Tjenester');
    expect(PHONE_KORT_META.tjenester.href).toBe('/prisliste');
    expect(PHONE_KORT_META.statistikk.href).toBe('/rapporter');
    const keys = DEALER_PHONE_HJEM.flatMap((r) => r.keys);
    expect(keys).not.toContain('rapporter');
    expect(keys).not.toContain('jobber');
    expect(keys).not.toContain('prisliste');
  });

  it('Timeplan-kortet er ikon+navn uten jobbliste eller Ny jobb', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).not.toMatch(/timeplanRader|Ingen jobber i dag|Ny jobb/);
    expect(hjem).not.toMatch(/plan\.map/);
    expect(hjem).toMatch(/PHONE_KORT_META\.timeplan|key === 'timeplan'|innboks.*timeplan/);
  });

  it('PC-sidebar: Timeplan og Tjenester, Organisasjon uten Timeplan-pille', () => {
    expect(FORHANDLER_NAV.map((i) => i.label)).toEqual([
      'Verkstedet',
      'Innboks',
      'Timeplan',
      'Kunder',
      'Lager',
      'Butikk',
      'Samarbeid',
      'Tjenester',
      'Organisasjon',
      'Hjelp',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'saker')?.pills?.map((p) => p.label)).toEqual([
      'Liste',
      'Kalender',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'tjenester')?.href).toBe('/prisliste');
    expect(ORGANISASJON_SEKSJONER.map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(
      pillsForRole(FORHANDLER_NAV.find((i) => i.key === 'organisasjon')!, 'dealer_staff').map(
        (p) => p.label,
      ),
    ).toEqual(['Oversikt', 'Ansatte']);
  });

  it('mekaniker beholder Dine jobber og ser ikke Organisasjon', () => {
    expect(MEKANIKER_NAV.map((i) => i.label)).toContain('Dine jobber');
    expect(MEKANIKER_NAV.some((i) => i.label === 'Organisasjon')).toBe(false);
    expect(les('../app/(app)/dine-jobber/_flate.tsx')).toMatch(/Dine jobber/);
    expect(les('../app/(app)/dine-jobber/_flate.tsx')).not.toMatch(/Kontor|Gulvet/);
  });

  it('Timeplan-destinasjon: Opprett jobb + Prisliste-dialog, Liste = kapasitet, Kalender = stripe', () => {
    const side = utenKommentarer(les('../app/(app)/saker/page.tsx'));
    const kalender = utenKommentarer(les('../app/(app)/saker/_kalender.tsx'));
    const kapasitet = utenKommentarer(les('../app/(app)/mekanikere/kapasitet/page.tsx'));
    expect(side).toMatch(/Timeplan/);
    expect(side).toMatch(/Opprett jobb/);
    expect(side).not.toMatch(/Ny jobb/);
    expect(side).toMatch(/Prisliste/);
    expect(side).toMatch(/Dialog|PrislisteDialog|prislisteApen/);
    expect(side).toMatch(/TimeplanFlate/);
    expect(side).toMatch(/TimeplanStripe/);
    expect(side).not.toMatch(/Saker|Kontor|Gulvet/);
    expect(kalender).toMatch(/TimeplanStripe|TIMEPLAN_DAG_START|osloDagsvindu/);
    expect(kalender).not.toMatch(/datetime-local/);
    expect(kapasitet).toMatch(/TimeplanStripe/);
    expect(kapasitet).not.toMatch(/overflow-x-auto/);
  });

  it('Opprett jobb og Prisliste står på samme rad som Liste|Kalender, ikke i tittelraden', () => {
    const side = utenKommentarer(les('../app/(app)/saker/page.tsx'));
    const h1 = side.indexOf('<h1');
    expect(h1).toBeGreaterThan(-1);
    const etterH1 = side.slice(h1);
    expect(etterH1.indexOf('SidePiller')).toBeGreaterThan(-1);
    expect(etterH1.indexOf('Opprett jobb')).toBeGreaterThan(etterH1.indexOf('SidePiller'));
    expect(etterH1.indexOf('Prisliste')).toBeGreaterThan(etterH1.indexOf('Opprett jobb'));
    expect(etterH1).toMatch(/justify-between[\s\S]*SidePiller[\s\S]*Opprett jobb[\s\S]*Prisliste/);
    expect(etterH1).toMatch(/\/bookinger\/ny/);
    expect(side.slice(0, h1)).not.toMatch(/Opprett jobb/);
  });

  it('Tjenester er /prisliste (samme services.list), /tjenester forblir abonnement', () => {
    expect(les('../app/(app)/prisliste/page.tsx')).toMatch(/PrislisteFlate/);
    expect(les('../app/(app)/prisliste/page.tsx')).not.toMatch(/redirect\('\/organisasjon'/);
    expect(les('../app/(app)/tjenester/page.tsx')).toMatch(/seksjon=abonnement/);
    expect(isItemActive(FORHANDLER_NAV.find((i) => i.key === 'tjenester')!, '/prisliste')).toBe(
      true,
    );
    expect(isItemActive(FORHANDLER_NAV.find((i) => i.key === 'organisasjon')!, '/prisliste')).toBe(
      false,
    );
    expect(breadcrumbFor('/prisliste', '', 'forhandler')).toEqual([
      { label: 'Tjenester', href: '/prisliste' },
    ]);
    expect(breadcrumbFor('/jobber', 'visning=kalender', 'forhandler')).toEqual([
      { label: 'Timeplan', href: '/jobber' },
      { label: 'Kalender' },
    ]);
    expect(PARKED_LABEL['/prisliste']).toBe('Tjenester');
    expect(parseOrgSeksjon('timeplan', true)).toBe('oversikt');
  });

  it('widget på /butikk kaller ikke forhandler.get og viser ikke «feil»', () => {
    const embed = utenKommentarer(les('../app/(app)/butikk/_booking-widget.tsx'));
    expect(embed).not.toMatch(/forhandler\.get/);
    expect(embed).toMatch(/services\.list/);
    expect(embed).not.toMatch(/embed\.error\.message/);
    expect(embed).toMatch(/Prøv igjen|Kunne ikke/);
    expect(embed).not.toMatch(/Kontor|Gulvet|Saker|Reserve with Google/);
  });

  it('forhandler-kort viser tomt skjema, ikke «feil», når profil mangler', () => {
    const kort = utenKommentarer(les('../app/(app)/organisasjon/forhandleren/_kort.tsx'));
    expect(kort).not.toMatch(/Kunne ikke hente forhandleren/);
    expect(kort).toMatch(/const vis = data \?\?/);
  });
});
