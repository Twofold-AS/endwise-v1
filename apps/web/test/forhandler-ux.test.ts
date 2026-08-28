import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  FORHANDLER_NAV,
  isItemActive,
  SETTINGS_NAV,
} from '../app/(app)/_shell/nav.ts';
import { FANE_ALIAS } from '../app/(app)/innstillinger/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-13 Forhandler-nav 26.08.2026', () => {
  it('har alias-sider så URL-navn matcher uten rename', () => {
    expect(les('../app/(app)/jobber/page.tsx')).toMatch(/from '\.\.\/saker\/page'/);
    expect(les('../app/(app)/rapporter/page.tsx')).toMatch(/from '\.\.\/analyse\/page'/);
    expect(les('../app/(app)/hjelp/page.tsx')).toMatch(/from '\.\.\/support\/page'/);
    expect(les('../app/(app)/verkstedet/page.tsx')).toMatch(/from '\.\.\/dashboard\/page'/);
    expect(les('../app/(app)/prisliste/page.tsx')).toMatch(
      /from '\.\.\/innstillinger\/tjenestekatalog\/page'/,
    );
    expect(les('../app/(app)/ansatte/page.tsx')).toMatch(/organisasjon\?seksjon=ansatte/);
    expect(les('../app/(app)/forhandleren/page.tsx')).toMatch(/redirect\('\/organisasjon'/);
  });

  it('settings-alias /koblinger og /integrasjoner lander på Organisasjon', () => {
    expect(FANE_ALIAS['/innstillinger/koblinger']).toBeUndefined();
    expect(FANE_ALIAS['/innstillinger/integrasjoner']).toBeUndefined();
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/koblinger')).toBe(false);
    expect(breadcrumbFor('/innstillinger/koblinger', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
    ]);
  });

  it('gamle /saker /analyse /support aktiverer de nye nav-radene', () => {
    const jobber = FORHANDLER_NAV.find((i) => i.key === 'saker');
    const rapporter = FORHANDLER_NAV.find((i) => i.key === 'analyse');
    const hjelp = FORHANDLER_NAV.find((i) => i.key === 'helpdesk');
    expect(jobber && isItemActive(jobber, '/saker')).toBe(true);
    expect(rapporter && isItemActive(rapporter, '/analyse')).toBe(true);
    expect(hjelp && isItemActive(hjelp, '/support')).toBe(true);
  });

  it('/prisliste og /verkstedet treffer Jobber og Verkstedet', () => {
    const jobber = FORHANDLER_NAV.find((i) => i.key === 'saker');
    const verksted = FORHANDLER_NAV.find((i) => i.key === 'dashboard');
    expect(jobber && isItemActive(jobber, '/prisliste')).toBe(false);
    expect(jobber && isItemActive(jobber, '/innstillinger/tjenestekatalog')).toBe(false);
    expect(verksted && isItemActive(verksted, '/verkstedet')).toBe(true);
    expect(verksted && isItemActive(verksted, '/prisliste')).toBe(false);
    expect(breadcrumbFor('/prisliste', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Oversikt' },
    ]);
  });

  it('Jobber-siden kaller listevisningen Liste', () => {
    const saker = les('../app/(app)/saker/page.tsx');
    expect(saker).toMatch(/label: 'Liste'/);
    expect(saker).not.toMatch(/label="Oversikt"/);
  });
});

describe('Tillit: 403, 404, varsler, identitet', () => {
  it('/admin viser Ikke tilgang uten å logge ut', () => {
    const gate = les('../lib/endwise-admin-gate.ts');
    expect(gate).toMatch(/return 'forbidden'/);
    expect(les('../app/(app)/_shell/ikke-tilgang.tsx')).toMatch(/Ikke tilgang/);
    expect(les('../app/not-found.tsx')).toMatch(/Siden finnes ikke/);
    expect(les('../app/not-found.tsx')).toMatch(/Tilbake til Verkstedet/);
  });

  it('varselbrytere er disabled, ikke klikkbare uten lagring', () => {
    const v = les('../app/(app)/innstillinger/varsler/_innhold.tsx');
    expect(v).toMatch(/disabled/);
    expect(v).not.toMatch(/onCheckedChange/);
  });

  it('footer bruker session.me og viser skjelett under last', () => {
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    const rad = les('../app/(app)/_shell/bruker-rad.tsx');
    expect(sidebar).toMatch(/navn=\{navn\}/);
    expect(sidebar).not.toMatch(/session\?\.user\?\.name/);
    expect(rad).toMatch(/animate-pulse/);
  });
});

describe('Ny jobb og tomflater', () => {
  it('dashboard-tomflate har Ny jobb som primærhandling', () => {
    const dash = les('../app/(app)/dashboard/page.tsx');
    expect(dash).toMatch(/Ingen jobber i dag/);
    expect(dash).toMatch(/Ny jobb/);
    expect(dash).toMatch(/animate-pulse/);
  });

  it('innboks-filtre har synlig tekst, tomflate peker på Skriv til Endwise', () => {
    const side = les('../app/(app)/innboks/_inbox-sidebar.tsx');
    const pane = les('../app/(app)/innboks/page.tsx');
    expect(side).toMatch(/<span>\{p\.label\}<\/span>/);
    expect(side).toMatch(/Skriv til Endwise/);
    expect(pane).toMatch(/Skriv til Endwise/);
    expect(side).not.toMatch(/SAK-/);
  });

  it('kalender utvider rasteret i stedet for å klippe 07–18', () => {
    const kal = les('../app/(app)/saker/_kalender.tsx');
    expect(kal).toMatch(/function rasterFor/);
    expect(kal).not.toMatch(/klippes inn i kanten/);
  });

  it('rapporter skjuler mock-filsti og viser tomflate uten bookinger', () => {
    const analyse = les('../app/(app)/analyse/page.tsx');
    expect(analyse).not.toMatch(/analyse\/_data\.ts/);
    expect(analyse).toMatch(/Ingen rapporter ennå/);
    expect(analyse).toMatch(/Eksempel — ikke live verkstedstall/);
  });

  it('Opprett ansatt forklarer at e-post er valgfri', () => {
    const inviter = les('../app/(app)/organisasjon/_opprett-dialog.tsx');
    expect(inviter).toMatch(/E-post adresse/);
    expect(inviter).toMatch(/Skriv inn navn når du oppretter uten e-post/);
    expect(inviter).toMatch(/Opprett ansatt/);
    expect(inviter).not.toMatch(/Inviter ansatt/);
  });
});
