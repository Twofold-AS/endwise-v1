import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  etter2faBekreftet,
  etter2faKodeBekreftet,
  fortsettEtter2faKvittering,
  GJENOPPRETTING_UGYLDIG_MELDING,
  harUbrukteGjenopprettingskoder,
  harUbrukteGjenopprettingskoderFraSvar,
  KODER_FILNAVN,
  kanFullforeKoder,
  koderSomTekstfil,
  krevBackupKoderEtterEnable,
  OTP_COOKIE_UTLOPT_MELDING,
  OTP_UGYLDIG_MELDING,
  OTP_UTLOPT_MELDING,
  plukkBackupKoder,
  slaaAv2faKall,
  TO_FAKTOR_DISABLE_AUDIT_ACTION,
  TO_FAKTOR_OPPSETT_STI,
  toFaktorStatusTekst,
  tolkToFaktorVerifySvar,
  validerSlaaAv2fa,
  visGjenopprettingsvalg,
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
    expect(tekst.toLowerCase()).not.toMatch(/password|session|secret|otp/);
    expect(KODER_FILNAVN).toBe('endwise-gjenopprettingskoder.txt');
  });

  it('⛔ /2fa-oppsett har ingen Hopp over, og fullfør krever kanFullforeKoder', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    expect(utenKommentarer).toMatch(/etter2faKodeBekreftet\s*\(/);
    expect(utenKommentarer).toMatch(/kanFullforeKoder\s*\(/);
    expect(utenKommentarer).toMatch(/krevBackupKoderEtterEnable\s*\(|plukkBackupKoder\s*\(/);
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

describe('F1-22: slå av krever passord — klientlaget er ikke sperren', () => {
  it('⛔ tomt passord avvises før kallet', () => {
    const r = validerSlaaAv2fa('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/passordet/i);
  });

  it('trimmer og sender KUN password — ingen klientflagg', () => {
    const sjekk = validerSlaaAv2fa('  hemmelig-passord-123  ');
    expect(sjekk.ok).toBe(true);
    if (!sjekk.ok) return;
    expect(slaaAv2faKall(sjekk)).toEqual({ password: 'hemmelig-passord-123' });
    expect(Object.keys(slaaAv2faKall(sjekk))).toEqual(['password']);
  });

  it('audit-handlingen er navngitt og inneholder ikke hemmeligheter', () => {
    expect(TO_FAKTOR_DISABLE_AUDIT_ACTION).toBe('two_factor.disabled');
  });

  it('ToFaktorRad og /2fa-oppsett slår av med passord — ikke bare en åpen sesjon', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const rad = readFileSync(
      resolve(her, '../../../apps/web/app/(app)/_shell/to-faktor-rad.tsx'),
      'utf8',
    );
    const oppsett = readFileSync(
      resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'),
      'utf8',
    );

    expect(rad).toMatch(/validerSlaaAv2fa/);
    expect(rad).toMatch(/twoFactor\.disable/);
    expect(rad).toMatch(/KREDENTIAL_MUTASJON_GENERISK_MELDING/);
    expect(rad).not.toMatch(/INVALID_PASSWORD/);
    expect(oppsett).toMatch(/validerSlaaAv2fa|steg === 'av'/);
    expect(oppsett).toMatch(/twoFactor\.disable/);
    expect(oppsett).toMatch(/KREDENTIAL_MUTASJON_GENERISK_MELDING/);
    expect(oppsett).not.toMatch(/INVALID_PASSWORD/);
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
      resolve(her, '../../../apps/web/app/(app)/innstillinger/_profil-fane.tsx'),
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

describe('F1-21: utløpt OTP skal aldri henge på «Sjekker koden»', () => {
  it('OTP_HAS_EXPIRED blir norsk feil — ikke ok, ikke pending', () => {
    const utfall = tolkToFaktorVerifySvar({
      error: { code: 'OTP_HAS_EXPIRED', message: 'OTP has expired', status: 400 },
    });
    expect(utfall.ok).toBe(false);
    if (utfall.ok) return;
    expect(utfall.feil).toBe(OTP_UTLOPT_MELDING);
    expect(utfall.knappeTilstand).toBe('error');
    expect(utfall.feil).toMatch(/ny kode/i);
    expect(utfall.feil).not.toMatch(/Sjekker/);
    expect(utfall.feil).not.toMatch(/OTP has expired/i);
  });

  it('kastet utløpt-feil (klienten thrower) gir samme norske svar', () => {
    const kastet = Object.assign(new Error('OTP has expired'), {
      body: { code: 'OTP_HAS_EXPIRED', message: 'OTP has expired' },
    });
    const utfall = tolkToFaktorVerifySvar(kastet);
    expect(utfall.ok).toBe(false);
    if (utfall.ok) return;
    expect(utfall.feil).toBe(OTP_UTLOPT_MELDING);
    expect(utfall.knappeTilstand).toBe('error');
  });

  it('tomt/pending-svar uten error er feil — ikke suksess som henger i finishSignIn', () => {
    expect(tolkToFaktorVerifySvar({ data: null, error: null }).ok).toBe(false);
    expect(tolkToFaktorVerifySvar({}).ok).toBe(false);
    expect(tolkToFaktorVerifySvar(undefined).ok).toBe(false);
    const tom = tolkToFaktorVerifySvar({ data: null });
    expect(tom.ok).toBe(false);
    if (tom.ok) return;
    expect(tom.knappeTilstand).toBe('error');
    expect(tom.feil).toBe(OTP_UGYLDIG_MELDING);
  });

  it('INVALID_TWO_FACTOR_COOKIE og ugyldig kode får norsk feil + vei videre', () => {
    const cookie = tolkToFaktorVerifySvar({
      error: { code: 'INVALID_TWO_FACTOR_COOKIE', message: 'Invalid two factor cookie' },
    });
    expect(cookie.ok).toBe(false);
    if (!cookie.ok) {
      expect(cookie.feil).toBe(OTP_COOKIE_UTLOPT_MELDING);
      expect(cookie.knappeTilstand).toBe('error');
    }

    const ugyldig = tolkToFaktorVerifySvar({
      error: { code: 'INVALID_CODE', message: 'Invalid code' },
    });
    expect(ugyldig.ok).toBe(false);
    if (!ugyldig.ok) {
      expect(ugyldig.feil).toBe(OTP_UGYLDIG_MELDING);
      expect(ugyldig.feil).toMatch(/ny kode/i);
    }

    const backup = tolkToFaktorVerifySvar({
      error: { code: 'INVALID_BACKUP_CODE', message: 'Invalid backup code' },
    });
    expect(backup.ok).toBe(false);
    if (!backup.ok) expect(backup.feil).toBe(GJENOPPRETTING_UGYLDIG_MELDING);
  });

  it('ekte suksess (data uten error) er ok', () => {
    expect(tolkToFaktorVerifySvar({ data: { status: true }, error: null }).ok).toBe(true);
    expect(tolkToFaktorVerifySvar({ data: { user: { id: 'u1' } } }).ok).toBe(true);
  });

  it('/signin fanger verify-feil og setter aldri loading uten avslutning', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/signin/signin-skjema.tsx'),
      'utf8',
    );
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const start = utenKommentarer.indexOf('async function onVerify');
    const slutt = utenKommentarer.indexOf('async function onResend', start);
    const onVerify = utenKommentarer.slice(start, slutt);

    expect(onVerify).toMatch(/tolkToFaktorVerifySvar/);
    expect(onVerify).toMatch(/try/);
    expect(onVerify).toMatch(/catch/);
    expect(onVerify).toMatch(/setBusy\('error'\)/);
    expect(onVerify).toMatch(/OTP_UTLOPT_MELDING|utfall\.feil/);
    expect(kilde).toMatch(/Send ny kode/);
    expect(kilde).toMatch(/Sjekker koden/);
  });

  it('etter-hooken fester ubrukte-koder-flagget på twoFactorRedirect', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const hook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    const auth = readFileSync(resolve(her, '../src/auth.ts'), 'utf8');
    expect(hook).toMatch(/festUbrukteGjenopprettingskoderPaaRedirect/);
    expect(auth).toMatch(/storeBackupCodes:\s*['"]encrypted['"]/);
    expect(auth).toMatch(/backupCodeOptions/);
  });
});

describe('F1-21: gjenopprettingsvalg skjules uten ubrukte koder', () => {
  it('ingen / tom / brukt-opp lagring = ingen valg', () => {
    expect(harUbrukteGjenopprettingskoder(null)).toBe(false);
    expect(harUbrukteGjenopprettingskoder(undefined)).toBe(false);
    expect(harUbrukteGjenopprettingskoder('')).toBe(false);
    expect(harUbrukteGjenopprettingskoder('[]')).toBe(false);
    expect(harUbrukteGjenopprettingskoder('null')).toBe(false);
    expect(visGjenopprettingsvalg(false)).toBe(false);
    expect(visGjenopprettingsvalg(null)).toBe(false);
    expect(visGjenopprettingsvalg(undefined)).toBe(false);
  });

  it('klartekst-liste eller kryptert blob med innhold = ubrukte koder', () => {
    expect(harUbrukteGjenopprettingskoder('["aaaaa-bbbbb"]')).toBe(true);
    expect(harUbrukteGjenopprettingskoder('enc:v1:ikke-tom-cipher')).toBe(true);
    expect(visGjenopprettingsvalg(true)).toBe(true);
  });

  it('innloggingssvaret uten flagg viser ikke valget — dead end unngås', () => {
    expect(harUbrukteGjenopprettingskoderFraSvar({ twoFactorRedirect: true })).toBe(false);
    expect(harUbrukteGjenopprettingskoderFraSvar(null)).toBe(false);
    expect(
      harUbrukteGjenopprettingskoderFraSvar({
        twoFactorRedirect: true,
        harUbrukteGjenopprettingskoder: true,
      }),
    ).toBe(true);
    expect(
      harUbrukteGjenopprettingskoderFraSvar({
        data: { twoFactorRedirect: true, harUbrukteGjenopprettingskoder: true },
      }),
    ).toBe(true);
  });

  it('/signin viser gjenoppretting bare når visGjenopprettingsvalg er sann', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/signin/signin-skjema.tsx'),
      'utf8',
    );
    expect(kilde).toMatch(/visGjenopprettingsvalg/);
    expect(kilde).toMatch(/harUbrukteGjenopprettingskoderFraSvar/);
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(utenKommentarer).toMatch(/visGjenopprettingsvalg\(/);
    expect(utenKommentarer).toMatch(/Bruk gjenopprettingskode/);
  });
});

describe('F1-21: koder er påkrevd ved enable — vises én gang, lagres ikke i klartekst', () => {
  it('krevBackupKoderEtterEnable nekter tomt svar — oppsett kan ikke hoppe over', () => {
    expect(krevBackupKoderEtterEnable({ method: 'otp' })).toEqual([]);
    expect(krevBackupKoderEtterEnable({ totpURI: 'otpauth://' })).toEqual([]);
    expect(krevBackupKoderEtterEnable({ backupCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'] })).toEqual([
      'aaaaa-bbbbb',
      'ccccc-ddddd',
    ]);
  });

  it('/2fa-oppsett avbryter uten koder fra enable', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'), 'utf8');
    const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const start = utenKommentarer.indexOf('async function startOppsett');
    const slutt = utenKommentarer.indexOf('async function bekreft', start);
    const startOppsett = utenKommentarer.slice(start, slutt);
    expect(startOppsett).toMatch(/krevBackupKoderEtterEnable|plukkBackupKoder/);
    expect(startOppsett).toMatch(/hentet\.length === 0|koder\.length === 0/);
    expect(startOppsett).toMatch(/setBusy\('error'\)/);
  });

  it('invite-enable fanger kodene og viser dem etter OTP — ikke hopp til avatar', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(
      resolve(her, '../../../apps/web/app/invitasjon/[token]/page.tsx'),
      'utf8',
    );
    expect(kilde).toMatch(/plukkBackupKoder|krevBackupKoderEtterEnable/);
    expect(kilde).toMatch(/steg === 'koder'|setSteg\('koder'\)/);
    expect(kilde).toMatch(/kanFullforeKoder/);
  });
});
