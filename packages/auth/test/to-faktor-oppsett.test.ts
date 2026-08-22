import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  etter2faBekreftet,
  fortsettEtter2faKvittering,
  TO_FAKTOR_OPPSETT_STI,
  toFaktorStatusTekst,
} from '../src/to-faktor-oppsett.ts';

/**
 * F1-20 / F1-23 / F1-25 — 2FA-status, kvittering og at oppsettsiden
 * faktisk viser kvitteringen før den navigerer.
 */

describe('F1-20: toFaktorStatusTekst', () => {
  it('viser På når twoFactorEnabled er true', () => {
    expect(toFaktorStatusTekst(true)).toBe('På — engangskode på e-post');
  });

  it('viser Av når twoFactorEnabled er false', () => {
    expect(toFaktorStatusTekst(false)).toBe('Av');
  });

  it('viser em-dash mens sesjonen laster', () => {
    expect(toFaktorStatusTekst(undefined)).toBe('—');
  });

  it('oppsettlenken peker på /2fa-oppsett — ikke en innstillingsside bak 2FA-gaten', () => {
    expect(TO_FAKTOR_OPPSETT_STI).toBe('/2fa-oppsett');
  });
});

describe('F1-23: kvittering før navigasjon', () => {
  it('etter bekreftelse: steg=ferdig og INGEN destinasjon', () => {
    expect(etter2faBekreftet()).toEqual({ steg: 'ferdig', navigerTil: null });
  });

  it('Fortsett navigerer til dashbordet — først da', () => {
    expect(fortsettEtter2faKvittering()).toEqual({ destinasjon: '/dashboard' });
  });

  it('⛔ sida kaller ikke location.assign i samme tick som steg=ferdig', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');

    // Den gamle feilen: setSteg('ferdig') og location.assign i SAMME blokk.
    // En kvittering som settes og rives i samme tick, er ingen kvittering.
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(utenKommentarer).toMatch(/etter2faBekreftet\s*\(/);
    expect(utenKommentarer).toMatch(/fortsettEtter2faKvittering\s*\(/);
    expect(utenKommentarer).toMatch(/location\.assign/);

    // assign skal ikke ligge i bekreft-funksjonen. Bekreft slutter før
    // Fortsett-handleren — ellers rekker kvitteringen aldri å rendre.
    const bekreftStart = utenKommentarer.indexOf('async function bekreft');
    const bekreftSlutt = utenKommentarer.indexOf('function fortsett', bekreftStart);
    const bekreftBlokk = utenKommentarer.slice(bekreftStart, bekreftSlutt);
    expect(bekreftBlokk).not.toMatch(/location\.assign/);
    expect(bekreftBlokk).toMatch(/etter2faBekreftet/);
  });
});

describe('F1-17 / F1-20: delt flate', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('ProfilKort eier ByttPassordSkjema — én komponent, to steder', () => {
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/_shell/profil-kort.tsx'),
      'utf8',
    );
    expect(kilde).toMatch(/ByttPassordSkjema/);
  });

  it('forhandlerens profil leser session.user.twoFactorEnabled og viser ToFaktorRad', () => {
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/innstillinger/profil/page.tsx'),
      'utf8',
    );
    expect(kilde).toMatch(/ToFaktorRad/);
    expect(kilde).toMatch(/twoFactorEnabled/);
    expect(kilde).not.toMatch(/påslag mangler/);
  });
});

describe('F1-25: oppsettsiden gjenbruker innloggingens byggeklosser', () => {
  it('importerer StatefulButton og PassordFelt fra /signin sine byggeklosser', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    expect(kilde).toMatch(/StatefulButton/);
    expect(kilde).toMatch(/PassordFelt/);
    expect(kilde).toMatch(/from ['"]\.\.\/_auth\/felter['"]/);
    expect(kilde).not.toMatch(/Bevisst UDESIGNET/);
  });
});
