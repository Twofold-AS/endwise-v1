import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FANER, innstillingerHref, parseFane } from '../app/(app)/innstillinger/_faner.ts';
import { slaaSammenSok } from '../app/(app)/_shell/phone-sok.ts';
import { PHONE_BAR2, PHONE_PROFIL_SIRKEL } from '../app/(app)/_shell/phone-chrome.ts';

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
    expect(PHONE_PROFIL_SIRKEL).toMatch(/bg-fg/);
    expect(PHONE_PROFIL_SIRKEL).toMatch(/text-bg/);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/PHONE_BAR2/);
    expect(shell).toMatch(/PHONE_PROFIL_SIRKEL/);
    expect(shell).toMatch(/data-phone-sok-ikon|Search/);
  });

  it('søk-overlay har ikke dest-ikonstripe eller store dest-rader', () => {
    const overlay = utenKommentarer(les('../app/(app)/_shell/phone-sok-overlay.tsx'));
    expect(overlay).toMatch(/search\.global|trpc\.search/);
    expect(overlay).toMatch(/data-phone-sok-gruppe/);
    expect(overlay).toMatch(/Ingen treff/);
    expect(overlay).not.toMatch(/data-phone-sok-dest-ikon/);
    expect(overlay).not.toMatch(/data-phone-sok-dest-rad/);
    expect(overlay).toMatch(/data-phone-sok-ikon/);
  });

  it('slår server-treff og sider sammen under kategoritittel', () => {
    const grupper = slaaSammenSok(
      [{ kategori: 'Kunde', treff: [{ id: '1', tittel: 'Kari Nordmann', under: null, href: '/kunder/1' }] }],
      [{ key: 'kunder', label: 'Kunder', href: '/kunder' }],
      'kari',
    );
    expect(grupper.map((g) => g.kategori)).toEqual(['Kunde']);
    const sider = slaaSammenSok([], [{ key: 'kunder', label: 'Kunder', href: '/kunder' }], 'kun');
    expect(sider[0]?.kategori).toBe('Sider');
  });

  it('profilmeny er Mobbin-struktur på norsk med blå Oppgrader-CTA', () => {
    const meny = utenKommentarer(les('../app/(app)/_shell/phone-profil-meny.tsx'));
    expect(meny).toMatch(/data-phone-profil-meny/);
    expect(meny).toMatch(/Oppgrader abonnement/);
    expect(meny).toMatch(/#0066ff/);
    expect(meny).toMatch(/Forespørsel/);
    expect(meny).toMatch(/Innstillinger/);
    expect(meny).toMatch(/PhoneTemaRad|Theme/);
    expect(meny).toMatch(/Veikart/);
    expect(meny).toMatch(/Oppdateringer/);
    expect(meny).toMatch(/Logg ut/);
    expect(meny).toMatch(/Vilkår/);
    expect(meny).not.toMatch(/data-ronny-sheet/);
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
    expect(fane).toMatch(/>Slett</);
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
