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

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-19: innstillinger er pille-faner, ikke en kort-hub', () => {
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

  it('har liggende pille-faner med låst rekkefølge', () => {
    expect(skall).toMatch(/role="tablist"/);
    expect(skall).toMatch(/rounded-pill/);
    expect([...FANE_IDS]).toEqual([
      'profil',
      'team',
      'integrasjoner',
      'abonnement',
      'varsler',
      'tjenester',
    ]);
    expect(FANER.map((f) => f.label)).toEqual([
      'Profil',
      'Team & tilgang',
      'Integrasjoner',
      'Abonnement',
      'Varsler',
      'Tjenester & priser',
    ]);
  });

  it('admin-faner er de samme som i den gamle hubben', () => {
    const admin = FANER.filter((f) => f.adminOnly).map((f) => f.id);
    expect(admin).toEqual(['team', 'integrasjoner', 'abonnement', 'tjenester']);
    expect(synligeFaner(false).map((f) => f.id)).toEqual(['profil', 'varsler']);
    expect(synligeFaner(true).map((f) => f.id)).toEqual([...FANE_IDS]);
  });

  it('«Bytt konto / mekaniker» er ikke en fane, og Admin er det heller ikke', () => {
    const labels = FANER.map((f) => f.label).join(' ');
    expect(labels).not.toMatch(/Bytt konto/i);
    expect(labels).not.toMatch(/mekaniker/i);
    expect(FANER.map((f) => f.label)).not.toContain('Admin');
    expect(FANER.map((f) => f.id)).not.toContain('admin');
  });

  it('kanonisk fane-URL er ?fane=, og gamle stier er alias', () => {
    expect(innstillingerHref('profil')).toBe('/innstillinger?fane=profil');
    expect(innstillingerHref('abonnement')).toBe('/innstillinger?fane=abonnement');
    expect(FANE_ALIAS['/innstillinger/profil']).toBe('profil');
    expect(FANE_ALIAS['/innstillinger/team']).toBe('team');
    expect(FANE_ALIAS['/innstillinger/varsler']).toBe('varsler');
    expect(FANE_ALIAS['/innstillinger/tjenester']).toBe('tjenester');
    expect(FANE_ALIAS['/abonnement']).toBe('abonnement');
    expect(FANE_ALIAS['/integrasjoner']).toBe('integrasjoner');
  });

  it('ukjent eller admin-only fane for ikke-admin faller til profil', () => {
    expect(parseFane(null, false)).toBe('profil');
    expect(parseFane('ukjent', true)).toBe('profil');
    expect(parseFane('team', false)).toBe('profil');
    expect(parseFane('team', true)).toBe('team');
    expect(parseFane('varsler', false)).toBe('varsler');
    expect(parseFane(null, false, 'abonnement')).toBe('profil');
    expect(parseFane(null, true, 'abonnement')).toBe('abonnement');
  });

  it('gamle sider renderer skallet med riktig startFane', () => {
    expect(les('../app/(app)/innstillinger/profil/page.tsx')).toMatch(/startFane="profil"/);
    expect(les('../app/(app)/innstillinger/team/page.tsx')).toMatch(/startFane="team"/);
    expect(les('../app/(app)/innstillinger/varsler/page.tsx')).toMatch(/startFane="varsler"/);
    expect(les('../app/(app)/innstillinger/tjenester/page.tsx')).toMatch(/startFane="tjenester"/);
    expect(les('../app/(app)/abonnement/page.tsx')).toMatch(/startFane="abonnement"/);
    expect(les('../app/(app)/integrasjoner/page.tsx')).toMatch(/startFane="integrasjoner"/);
  });

  it('profil-fanen beholder blobatar og har ikke filopplasting', () => {
    expect(profilFane).toMatch(/AvatarVelger/);
    expect(profilFane).toMatch(/ToFaktorRad/);
    expect(profilFane).toMatch(/twoFactorEnabled/);
    expect(profilFane).toMatch(/<Switch/);
    expect(profilFane).not.toMatch(/type=['"]file['"]/);
    expect(profilFane).toMatch(/Ingen filopplasting/);
    expect(profilFane).not.toMatch(/timezone|tidssone|ukestart|datoformat/i);
    expect(profilFane).not.toMatch(/Search settings|Pinned|PRO-badge/i);
  });

  it('profil-raden har avatar til venstre for visningsnavn|e-post, formvelger foldet', () => {
    expect(profilFane).toMatch(/size=\{56\}/);
    expect(profilFane).toMatch(/foldFormer/);
    expect(profilFane).toMatch(/VisningsnavnFelt/);
    expect(profilFane).toMatch(/readOnly/);
    expect(profilFane).toMatch(/<AvatarVelger[\s\S]*?<\/AvatarVelger>/);
    expect(profilFane).not.toMatch(/<AvatarVelger[^>]*\/>/);
    expect(profilFane).toMatch(/sm:grid-cols-2/);
    const avatar = les('../app/(app)/_avatar/avatar-velger.tsx');
    expect(avatar).toMatch(/flex flex-row items-start gap-4/);
    expect(avatar).toMatch(/<details/);
    expect(avatar).toMatch(/Endre form/);
    expect(avatar).not.toMatch(/from '@\/components\/ui\/collapsible'/);
  });

  it('ingen sticky Save-bar, ingen grønn switch/save, ingen nested Settings', () => {
    expect(skall).not.toMatch(/sticky/);
    expect(skall).not.toMatch(/bg-success|bg-green|#1ED27D|#22c55e/);
    expect(page).not.toMatch(/Search settings/);
    const nav = les('../app/(app)/_shell/nav.ts');
    const settings = nav.slice(
      nav.indexOf('export const SETTINGS_NAV'),
      nav.indexOf('MEKANIKER_NAV'),
    );
    expect(settings).toMatch(/href: '\/innstillinger'/);
    expect(settings).toMatch(/href: '\/abonnement'/);
    expect(settings).toMatch(/href: '\/innstillinger\/varsler'/);
    expect(settings).toMatch(/href: '\/innstillinger\/team'/);
    expect(settings).toMatch(/href: '\/innstillinger\/tjenester'/);
    expect(settings).toMatch(/href: '\/integrasjoner'/);
    expect(settings).toMatch(/href: '\/innstillinger\/profil'/);
    expect(settings).not.toMatch(/label: 'Admin'/);
  });
});
