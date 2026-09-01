import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FANE_ALIAS,
  FANE_IDS,
  FANER,
  innstillingerHref,
  parseFane,
  synligeFaner,
} from '../app/(app)/innstillinger/_faner.ts';

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-19: innstillinger er Profil + Varsler', () => {
  const page = les('../app/(app)/innstillinger/page.tsx');
  const skall = les('../app/(app)/innstillinger/_skall.tsx');
  const profilFane = les('../app/(app)/innstillinger/_profil-fane.tsx');

  it('hub-kortene og «Bytt konto»-kortet er borte', () => {
    expect(page).not.toMatch(/SEKSJONER/);
    expect(page).not.toMatch(/md:grid-cols-2/);
    expect(page).not.toMatch(/Bytt konto/);
    expect(page).not.toMatch(/ArrowLeftRight/);
    expect(page).toMatch(/InnstillingerSkall/);
    expect(skall).not.toMatch(/Bytt konto/);
  });

  it('sidetittelen er Innstillinger, ikke Settings', () => {
    expect(skall).toMatch(/>Innstillinger</);
    expect(skall).not.toMatch(/>Settings</);
    expect(page).not.toMatch(/>Settings</);
  });

  it('har kun Profil og Varsler — Abonnement/Koblinger/Tjenester er flyttet', () => {
    expect(skall).toMatch(/role="tablist"/);
    expect([...FANE_IDS]).toEqual(['profil', 'varsler']);
    expect(FANER.map((f) => f.label)).toEqual(['Profil', 'Varsler']);
    expect(FANER.map((f) => f.id)).not.toContain('team');
    expect(FANER.map((f) => f.id)).not.toContain('abonnement');
    expect(FANER.map((f) => f.label)).not.toContain('Team & tilgang');
    expect(skall).not.toMatch(/TeamInnhold/);
    expect(skall).not.toMatch(/AbonnementInnhold/);
  });

  it('Endwise-plattform ser kun Profil', () => {
    expect(synligeFaner(false).map((f) => f.id)).toEqual(['profil', 'varsler']);
    expect(synligeFaner(true).map((f) => f.id)).toEqual(['profil', 'varsler']);
    expect(synligeFaner(true, false).map((f) => f.id)).toEqual(['profil']);
    expect(synligeFaner(false, false).map((f) => f.id)).toEqual(['profil']);
  });

  it('«Bytt konto / mekaniker» er ikke en fane, og Admin er det heller ikke', () => {
    const labels = FANER.map((f) => f.label).join(' ');
    expect(labels).not.toMatch(/Bytt konto/i);
    expect(labels).not.toMatch(/mekaniker/i);
    expect(FANER.map((f) => f.label)).not.toContain('Admin');
    expect(FANER.map((f) => f.id)).not.toContain('admin');
  });

  it('kanonisk fane-URL er ?fane=, gamle dealer-stier er ikke lenger alias', () => {
    expect(innstillingerHref('profil')).toBe('/innstillinger?fane=profil');
    expect(FANE_ALIAS['/innstillinger/profil']).toBe('profil');
    expect(FANE_ALIAS['/innstillinger/team']).toBeUndefined();
    expect(FANE_ALIAS['/innstillinger/varsler']).toBe('varsler');
    expect(FANE_ALIAS['/abonnement']).toBeUndefined();
    expect(FANE_ALIAS['/integrasjoner']).toBeUndefined();
  });

  it('ukjent fane faller til profil', () => {
    expect(parseFane(null, false)).toBe('profil');
    expect(parseFane('ukjent', true)).toBe('profil');
    expect(parseFane('team', false)).toBe('profil');
    expect(parseFane('varsler', false)).toBe('varsler');
    expect(parseFane('abonnement', true, 'profil', false)).toBe('profil');
  });

  it('gamle Abonnement- og Tjenester-URL-er er dealer-ruter som plattform redirecter vekk', () => {
    const kopi = les('../app/(app)/_lib/plattform.ts');
    expect(kopi).toMatch(/pathname\.startsWith\('\/tjenester'\)/);
    expect(les('../app/(app)/layout.tsx')).toMatch(/erForhandlerRutePaaPlattform\(pathname,/);
  });

  it('gamle sider redirecter til Organisasjon, Team er Organisasjon › Ansatte', () => {
    expect(les('../app/(app)/innstillinger/profil/page.tsx')).toMatch(/startFane="profil"/);
    expect(les('../app/(app)/innstillinger/team/page.tsx')).toMatch(
      /organisasjon\?seksjon=ansatte/,
    );
    expect(les('../app/(app)/innstillinger/varsler/page.tsx')).toMatch(/startFane="varsler"/);
    expect(les('../app/(app)/innstillinger/tjenester/page.tsx')).toMatch(
      /organisasjon\?seksjon=abonnement/,
    );
    expect(les('../app/(app)/abonnement/page.tsx')).toMatch(/organisasjon\?seksjon=abonnement/);
    expect(les('../app/(app)/integrasjoner/page.tsx')).toMatch(
      /organisasjon\?seksjon=integrasjoner/,
    );
    expect(les('../app/(app)/innstillinger/koblinger/page.tsx')).toMatch(
      /organisasjon\?seksjon=integrasjoner/,
    );
    expect(les('../app/(app)/innstillinger/integrasjoner/page.tsx')).toMatch(
      /organisasjon\?seksjon=integrasjoner/,
    );
  });

  it('profil-fanen viser bloub og har ikke filopplasting', () => {
    expect(profilFane).toMatch(/<Avatar/);
    expect(profilFane).not.toMatch(/AvatarVelger/);
    expect(profilFane).toMatch(/ToFaktorRad/);
    expect(profilFane).toMatch(/twoFactorEnabled/);
    expect(profilFane).toMatch(/VarslingslyderRad/);
    expect(profilFane).not.toMatch(/Mørkt tema/);
    expect(profilFane).not.toMatch(/type=['"]file['"]/);
    expect(profilFane).toMatch(/Ingen filopplasting/);
    expect(profilFane).not.toMatch(/timezone|tidssone|ukestart|datoformat/i);
    expect(profilFane).not.toMatch(/Search settings|Pinned|PRO-badge/i);
  });

  it('profil-raden har avatar + endre-knapp øverst, feltene stables under uten kort', () => {
    expect(profilFane).toMatch(/size=\{56\}/);
    expect(profilFane).not.toMatch(/foldFormer/);
    expect(profilFane).toMatch(/VisningsnavnFelt/);
    expect(profilFane).toMatch(/KallenavnFelt/);
    expect(profilFane).toMatch(/ByttEpostSkjema/);
    expect(profilFane).toMatch(/readOnly/);
    expect(profilFane).not.toMatch(/AvatarVelger/);
    expect(profilFane).not.toMatch(/sm:grid-cols-2/);
  });

  it('ingen sticky Save-bar, ingen grønn switch/save, Organisasjon ligger i sidebaren', () => {
    expect(skall).not.toMatch(/sticky/);
    expect(skall).not.toMatch(/bg-success|bg-green|#1ED27D|#22c55e/);
    expect(page).not.toMatch(/Search settings/);
    expect(skall).toMatch(/erPlattform|erForhandler/);
    expect(skall).toMatch(/faner\.length > 1/);
    const nav = les('../app/(app)/_shell/nav.ts');
    const settings = utenKommentarer(
      nav.slice(nav.indexOf('export const SETTINGS_NAV'), nav.indexOf('MEKANIKER_NAV')),
    );
    expect(settings).toMatch(/href: '\/innstillinger\/profil'/);
    expect(settings).not.toMatch(/href: '\/abonnement'/);
    expect(settings).not.toMatch(/label: 'Team & tilgang'/);
    expect(settings).not.toMatch(/label: 'Admin'/);
    expect(nav).toMatch(/key: 'organisasjon'/);
    expect(nav).toMatch(/href: '\/organisasjon'/);
    expect(nav).toMatch(/label: 'Organisasjon'/);
  });
});
