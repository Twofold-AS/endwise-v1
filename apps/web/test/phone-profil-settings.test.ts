import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PHONE_AVATAR_KLASSE,
  PHONE_AVATAR_PX,
  PHONE_BAR2,
  PHONE_BAR2_PY,
  PHONE_PROFIL_MENY_BREDDE,
  PHONE_PROFIL_MENY_TOPP,
  PHONE_PROFIL_RAD,
  PHONE_PROFIL_SIRKEL,
  PHONE_PROFIL_VILKAR,
  PHONE_RONNY_SIRKEL,
  ronnySizeForSirkel,
} from '../app/(app)/_shell/phone-chrome.ts';
import { slaaSammenSok } from '../app/(app)/_shell/phone-sok.ts';
import { FANER, innstillingerHref, parseFane } from '../app/(app)/innstillinger/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael 08.09 — telefon søk + profil + Konto', () => {
  it('top-bar 2 har mer luft; profil-sirkel er token-invertert', () => {
    expect(PHONE_BAR2).toMatch(/py-2\.5/);
    expect(PHONE_PROFIL_SIRKEL).toMatch(/ew-profil-sirkel/);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/PHONE_BAR2/);
    expect(shell).toMatch(/PHONE_PROFIL_SIRKEL/);
    expect(shell).toMatch(/data-phone-sok-ikon|Search/);
  });

  it('søk-overlay har dest-ikonstripe og kategoriserte treff', () => {
    const overlay = utenKommentarer(les('../app/(app)/_shell/phone-sok-overlay.tsx'));
    expect(overlay).toMatch(/search\.global|trpc\.search/);
    expect(overlay).toMatch(/data-phone-sok-gruppe/);
    expect(overlay).toMatch(/Ingen treff/);
    expect(overlay).toMatch(/data-phone-sok-dest-ikon/);
    expect(overlay).toMatch(/data-phone-sok-dest-stripe/);
    expect(overlay).not.toMatch(/data-phone-sok-dest-rad/);
    expect(overlay).toMatch(/PhoneSokFelt|data-phone-sok-ikon/);
  });

  it('slår server-treff og sider sammen under kategoritittel', () => {
    const grupper = slaaSammenSok(
      [
        {
          kategori: 'Kunde',
          treff: [{ id: '1', tittel: 'Kari Nordmann', under: null, href: '/kunder/1' }],
        },
      ],
      [{ key: 'kunder', label: 'Kunder', href: '/kunder' }],
      'kari',
    );
    expect(grupper.map((g) => g.kategori)).toEqual(['Kunde']);
    const sider = slaaSammenSok([], [{ key: 'kunder', label: 'Kunder', href: '/kunder' }], 'kun');
    expect(sider[0]?.kategori).toBe('Sider');
  });

  it('Ronny og profil deler samme 28px size-7-sirkel; Ronny fyller disken', () => {
    expect(PHONE_AVATAR_PX).toBe(28);
    expect(PHONE_AVATAR_KLASSE).toMatch(/size-7/);
    expect(PHONE_RONNY_SIRKEL).toContain(PHONE_AVATAR_KLASSE);
    expect(PHONE_PROFIL_SIRKEL).toContain(PHONE_AVATAR_KLASSE);
    expect(ronnySizeForSirkel(PHONE_AVATAR_PX)).toBe(44);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/PHONE_RONNY_SIRKEL/);
    expect(shell).toMatch(/PHONE_PROFIL_SIRKEL/);
    expect(shell).toMatch(/ronnySizeForSirkel\(PHONE_AVATAR_PX\)/);
    expect(shell.match(/PHONE_RONNY_SIRKEL/g)?.length).toBeGreaterThanOrEqual(2);
    expect(shell.match(/PHONE_PROFIL_SIRKEL/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('profilmeny er smalere Mobbin-struktur med Modus-segment og vilkår-tykkelse', () => {
    const meny = utenKommentarer(les('../app/(app)/_shell/phone-profil-meny.tsx'));
    const tema = utenKommentarer(les('../app/(app)/_shell/phone-tema-rad.tsx'));
    expect(meny).toMatch(/data-phone-profil-meny/);
    expect(meny).toMatch(/Oppgrader abonnement/);
    expect(meny).toMatch(/#0066ff/);
    expect(meny).toMatch(/Forespørsel/);
    expect(meny).toMatch(/Innstillinger/);
    expect(meny).toMatch(/PhoneTemaRad/);
    expect(meny).toMatch(/PHONE_PROFIL_MENY_BREDDE|260px/);
    expect(meny).toMatch(/PHONE_PROFIL_MENY_TOPP|mt-2\.5/);
    expect(meny).not.toMatch(/320px/);
    expect(meny).not.toMatch(/top-full right-3[\s\S]*mt-1/);
    expect(meny).toMatch(/data-phone-profil-modus-over/);
    expect(meny).toMatch(/data-phone-profil-modus-under/);
    expect(meny).toMatch(/data-phone-profil-vilkar-skille/);
    expect(meny).toMatch(/data-phone-profil-vilkar/);
    expect(meny).toMatch(/ew-haarlinje/);
    expect(meny).not.toMatch(/h-px bg-border/);
    expect(meny).not.toMatch(/mx-4/);
    expect(meny).toMatch(/PHONE_PROFIL_VILKAR/);
    expect(meny).toMatch(/data-phone-profil-ut-skille/);
    expect(meny).toMatch(/Twofold/);
    expect(meny).toMatch(/Veikart/);
    expect(meny).toMatch(/Oppdateringer/);
    expect(meny).toMatch(/Logg ut/);
    expect(meny).toMatch(/Vilkår/);
    expect(meny).not.toMatch(/data-ronny-sheet/);
    expect(tema).toMatch(/>Modus</);
    expect(tema).not.toMatch(/>Theme</);
    expect(tema).toMatch(/data-phone-modus-segment/);
    expect(tema).toMatch(/data-modus-sirkel/);
    expect(tema).toMatch(/border border-fg/);
    expect(tema).toMatch(/ew-modus-plate/);
    expect(tema).not.toMatch(/bg-inset/);
    expect(les('../../../packages/ui/src/theme.css')).toMatch(/\.ew-modus-plate/);
    expect(meny).toMatch(/PHONE_PROFIL_RAD/);
    expect(PHONE_PROFIL_RAD).toMatch(/h-8/);
    expect(PHONE_PROFIL_RAD).toMatch(/text-\[17px\]/);
    expect(PHONE_PROFIL_RAD).toMatch(/font-\[700\]/);
    expect(PHONE_PROFIL_VILKAR).toMatch(/text-\[13px\]/);
    expect(PHONE_PROFIL_VILKAR).not.toMatch(/font-\[700\]/);
    expect(PHONE_PROFIL_MENY_BREDDE).toMatch(/260px/);
    expect(PHONE_PROFIL_MENY_TOPP).toBe('top-full mt-2.5');
    expect(PHONE_BAR2).toContain(PHONE_BAR2_PY);
    expect(PHONE_BAR2_PY).toBe('py-2.5');
  });

  it('settings-chrome: tilbake med hale, Konto først, underline på aktiv', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/TilbakePil/);
    expect(shell).toMatch(/data-shell-tilbake/);
    expect(shell).toMatch(/>Innstillinger</);
    expect(shell).toMatch(/data-phone-settings-nav/);
    expect(shell).toMatch(/border-b-2/);
    expect(FANER[0]?.label).toBe('Konto');
    expect(parseFane('konto', true)).toBe('profil');
    expect(innstillingerHref('profil')).toBe('/innstillinger?fane=konto');
  });

  it('Konto-fanen: stille avatar, rader med Endre, administrer konto', () => {
    const fane = utenKommentarer(les('../app/(app)/innstillinger/_profil-fane.tsx'));
    expect(fane).toMatch(/bevegelse="stille"/);
    expect(fane).not.toMatch(/AvatarVelger/);
    expect(fane).not.toMatch(/type=['"]file['"]/);
    expect(fane).toMatch(/Personlige detaljer/);
    expect(fane).toMatch(/Administrer konto/);
    expect(fane).toMatch(/Logg ut overalt/);
    expect(fane).toMatch(/Du vil bli logget ut på alle enheter/);
    expect(fane).toMatch(/Slett hele kontoen din fra Endwise/);
    expect(fane).toMatch(/bg-danger/);
    expect(fane).toMatch(/['"]Slett['"]/);
    expect(fane).toMatch(/Ingen filopplasting|bevegelse="stille"/);
  });

  it('autentikator-bekreftelse heter bare Bekreftelse', () => {
    const steg = les('../app/signin/signin-steg.ts');
    const skjema = utenKommentarer(les('../app/signin/signin-skjema.tsx'));
    const totp = utenKommentarer(les('../app/2fa-oppsett/page.tsx'));
    expect(steg).toMatch(/SIGNIN_TOTP_TITTEL = 'Bekreftelse'/);
    expect(skjema).toMatch(/SIGNIN_TOTP_TITTEL/);
    expect(skjema).not.toMatch(/Bekreft med autentikator/);
    expect(totp).toMatch(/'Bekreftelse'/);
    expect(totp).not.toMatch(/Bekreft med autentikator/);
  });
});
