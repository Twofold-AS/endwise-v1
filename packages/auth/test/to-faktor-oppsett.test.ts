import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  etter2faBekreftet,
  etter2faKodeBekreftet,
  fortsettEtter2faKvittering,
  KODER_FILNAVN,
  kanFullforeKoder,
  koderSomTekstfil,
  plukkBackupKoder,
  plukkTotpUri,
  secretFraTotpUri,
  kanStarteTotpOppsett,
  TO_FAKTOR_DISABLE_AUDIT_ACTION,
  TO_FAKTOR_OPPSETT_STI,
  TOTP_OPPSETT_INGRESS,
  toFaktorStatusTekst,
} from '../src/to-faktor-oppsett.ts';

/**
 * F1-20 / F1-23 / F1-25 — 2FA-status, kvittering og at oppsettsiden
 * faktisk viser kvitteringen før den navigerer.
 */

describe('F1-20: toFaktorStatusTekst', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('viser På når twoFactorEnabled er true', () => {
    expect(toFaktorStatusTekst(true)).toBe('På — autentikator-app');
  });

  it('viser Av når twoFactorEnabled er false', () => {
    expect(toFaktorStatusTekst(false)).toBe('Av');
  });

  it('viser em-dash mens sesjonen laster', () => {
    expect(toFaktorStatusTekst(undefined)).toBe('—');
  });

  it('oppsettlenken peker på /2fa-oppsett — senere opt-in fra innstillinger', () => {
    expect(TO_FAKTOR_OPPSETT_STI).toBe('/2fa-oppsett');
    expect(TOTP_OPPSETT_INGRESS).toMatch(/valgfritt/i);
    expect(TOTP_OPPSETT_INGRESS).not.toMatch(/Rollen din krever|nå-eller-aldri|må/i);
    expect(kanStarteTotpOppsett(true)).toBe(true);
    expect(kanStarteTotpOppsett(false)).toBe(false);
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    expect(kilde).toMatch(/TOTP_OPPSETT_INGRESS|kanStarteTotpOppsett/);
    expect(kilde).toMatch(/useSession/);
    expect(kilde).toMatch(/twoFactor\.enable/);
    expect(kilde).not.toMatch(/Rollen din krever/);
  });
});

describe('F1-23: kvittering før navigasjon', () => {
  it('etter bekreftelse: steg=ferdig og INGEN destinasjon', () => {
    expect(etter2faBekreftet()).toEqual({ steg: 'ferdig', navigerTil: null });
  });

  it('Fortsett navigerer til dashbordet — først da', () => {
    expect(fortsettEtter2faKvittering()).toEqual({ destinasjon: '/dashboard' });
  });

  it('Fortsett kan følge session.me.landing (eier-veiviser)', () => {
    expect(fortsettEtter2faKvittering('/oppstart')).toEqual({ destinasjon: '/oppstart' });
    expect(fortsettEtter2faKvittering('https://evil.example')).toEqual({
      destinasjon: '/dashboard',
    });
  });

  it('⛔ sida kaller ikke location.assign i samme tick som steg=ferdig', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');

    // Den gamle feilen: setSteg('ferdig') og location.assign i samme blokk.
    // En kvittering som settes og rives i samme tick, er ingen kvittering.
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(utenKommentarer).toMatch(/etter2faBekreftet\s*\(/);
    expect(utenKommentarer).toMatch(/fortsettEtter2faKvittering\s*\(/);
    expect(utenKommentarer).toMatch(/location\.assign/);

    // assign skal ikke ligge i bekreft eller i koder-steget. Navigasjon
    // hører til Fortsett — ellers rekker hverken koder eller kvittering å rendre.
    const bekreftStart = utenKommentarer.indexOf('async function bekreft');
    const bekreftSlutt = utenKommentarer.indexOf('function lastNedKoder', bekreftStart);
    const bekreftBlokk = utenKommentarer.slice(bekreftStart, bekreftSlutt);
    expect(bekreftBlokk).not.toMatch(/location\.assign/);
    expect(bekreftBlokk).toMatch(/etter2faKodeBekreftet/);
    expect(bekreftBlokk).not.toMatch(/etter2faBekreftet\s*\(/);
  });
});

describe('F1-21: gjenopprettingskoder kan ikke hoppes over', () => {
  it('etter OTP: vis kodene — ikke kvittering, ikke navigasjon', () => {
    expect(etter2faKodeBekreftet()).toEqual({ steg: 'koder' });
  });

  it('⛔ uten nedlasting ELLER kopiering er oppsettet uferdig — også med avkrysning', () => {
    expect(kanFullforeKoder({ lastetNed: false, kopiert: false, bekreftetLagret: true })).toBe(
      false,
    );
    expect(kanFullforeKoder({ lastetNed: false, kopiert: false, bekreftetLagret: false })).toBe(
      false,
    );
  });

  it('⛔ nedlasting uten bekreftelse er ikke nok — folk klikker seg forbi', () => {
    expect(kanFullforeKoder({ lastetNed: true, kopiert: false, bekreftetLagret: false })).toBe(
      false,
    );
    expect(kanFullforeKoder({ lastetNed: false, kopiert: true, bekreftetLagret: false })).toBe(
      false,
    );
  });

  it('fullfør først når kodene er lastet ned eller kopiert OG bekreftet lagret', () => {
    expect(kanFullforeKoder({ lastetNed: true, kopiert: false, bekreftetLagret: true })).toBe(true);
    expect(kanFullforeKoder({ lastetNed: false, kopiert: true, bekreftetLagret: true })).toBe(true);
  });

  it('plukker backupCodes fra enable-svaret — også når klienten wrapper i data', () => {
    expect(plukkBackupKoder({ backupCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'] })).toEqual([
      'aaaaa-bbbbb',
      'ccccc-ddddd',
    ]);
    expect(plukkBackupKoder({ data: { backupCodes: ['eeee-ffff'] } })).toEqual(['eeee-ffff']);
    expect(plukkBackupKoder({ totpURI: 'otpauth://' })).toEqual([]);
    expect(plukkBackupKoder(null)).toEqual([]);
  });

  it('tekstfilen inneholder kodene og aldri hemmeligheter fra sesjonen', () => {
    const tekst = koderSomTekstfil(['aaaaa-bbbbb']);
    expect(tekst).toContain('aaaaa-bbbbb');
    expect(tekst).toMatch(/gjenopprettingskoder/i);
    expect(tekst).toMatch(/ikke i samme innboks som magic link/);
    expect(tekst.toLowerCase()).not.toMatch(/password|session|secret|otp/);
    expect(KODER_FILNAVN).toBe('endwise-gjenopprettingskoder.txt');
  });

  it('⛔ /2fa-oppsett har ingen Hopp over, og fullfør krever kanFullforeKoder', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    expect(utenKommentarer).toMatch(/etter2faKodeBekreftet\s*\(/);
    expect(utenKommentarer).toMatch(/kanFullforeKoder\s*\(/);
    expect(utenKommentarer).toMatch(/plukkBackupKoder\s*\(/);
    expect(utenKommentarer).not.toMatch(/Hopp over/i);
    expect(utenKommentarer).not.toMatch(/skip/i);

    const fullforStart = utenKommentarer.indexOf('function fullforKoder');
    expect(fullforStart).toBeGreaterThan(-1);
    const fullforSlutt = utenKommentarer.indexOf('function fortsett', fullforStart);
    const fullforBlokk = utenKommentarer.slice(fullforStart, fullforSlutt);
    expect(fullforBlokk).toMatch(/kanFullforeKoder/);
    expect(fullforBlokk).toMatch(/etter2faBekreftet/);
    expect(fullforBlokk).not.toMatch(/location\.assign/);
  });
});

describe('F1-22: selvbetjent slå-av er stengt', () => {
  it('audit-handlingen er navngitt og inneholder ikke hemmeligheter', () => {
    expect(TO_FAKTOR_DISABLE_AUDIT_ACTION).toBe('two_factor.disabled');
  });

  it('ToFaktorRad og /2fa-oppsett har ikke disable-kall', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const rad = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/_shell/to-faktor-rad.tsx'),
      'utf8',
    );
    const oppsett = readFileSync(
      resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'),
      'utf8',
    );

    expect(rad).not.toMatch(/twoFactor\.disable/);
    expect(rad).toMatch(/Be en leder om å tilbakestille/);
    expect(rad).not.toMatch(/type=["']password["']/);
    expect(oppsett).not.toMatch(/twoFactor\.disable/);
    expect(oppsett).toMatch(/Be en leder om å tilbakestille/);
    expect(oppsett).not.toMatch(/type=["']password["']/);
    expect(oppsett).not.toMatch(/INVALID_PASSWORD/);
  });

  it('plukker totpURI og secret fra enable-svaret', () => {
    const uri = 'otpauth://totp/Endwise:a@b.c?secret=ABCDEF&issuer=Endwise';
    expect(plukkTotpUri({ totpURI: uri })).toBe(uri);
    expect(plukkTotpUri({ data: { totpURI: uri } })).toBe(uri);
    expect(secretFraTotpUri(uri)).toBe('ABCDEF');
  });
});

describe('F1-17 / F1-20: delt flate', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('ProfilKort har ikke ByttPassordSkjema', () => {
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/_shell/profil-kort.tsx'),
      'utf8',
    );
    expect(kilde).not.toMatch(/ByttPassordSkjema/);
  });

  it('forhandlerens profil leser session.user.twoFactorEnabled og viser ToFaktorRad', () => {
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/innstillinger/_profil-fane.tsx'),
      'utf8',
    );
    expect(kilde).toMatch(/ToFaktorRad/);
    expect(kilde).toMatch(/twoFactorEnabled/);
    expect(kilde).not.toMatch(/påslag mangler/);
  });
});

describe('F1-25: oppsettsiden gjenbruker innloggingens byggeklosser', () => {
  it('importerer StatefulButton og Field — ingen PassordFelt', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    expect(kilde).toMatch(/StatefulButton/);
    expect(kilde).toMatch(/Field, INPUT/);
    expect(kilde).toMatch(/from ['"]\.\.\/_auth\/felter['"]/);
    expect(kilde).not.toMatch(/PassordFelt/);
    expect(kilde).not.toMatch(/Bevisst UDESIGNET/);
  });
});
