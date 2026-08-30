import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  destinasjonEtterInvite,
  destinasjonNarSesjonFeiler,
  destinasjonVedManglendeSesjon,
  erUautorisert,
  feilKlasseUtenHemmelighet,
  krevRevokeAndreSesjoner,
  MANGLER_SESJON_UI,
  norskAuthFeil,
  REVOKE_ANDRE_SESJONER_UI,
  trengerKodeSteg,
} from '../app/invitasjon/_landing.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('P0: invitee lander uten å logge inn på nytt', () => {
  const kilde = readFileSync(resolve(her, '../app/invitasjon/[token]/page.tsx'), 'utf8');

  it('eier går til /oppstart, ansatt følger session.me.landing', () => {
    expect(destinasjonEtterInvite('owner', '/dashboard')).toBe('/oppstart');
    expect(destinasjonEtterInvite('owner', null)).toBe('/oppstart');
    expect(destinasjonEtterInvite('staff', '/innboks')).toBe('/innboks');
    expect(destinasjonEtterInvite('staff', '/min-dag')).toBe('/min-dag');
    expect(destinasjonEtterInvite('staff', 'https://evil.example')).toBe('/dashboard');
    expect(destinasjonEtterInvite('staff', null)).toBe('/dashboard');
  });

  it('2FA-kode vises ved twoFactorRedirect eller TWO_FACTOR_REQUIRED', () => {
    expect(trengerKodeSteg({ twoFactorRedirect: true })).toBe(true);
    expect(trengerKodeSteg({ feil: 'TWO_FACTOR_REQUIRED' })).toBe(true);
    expect(trengerKodeSteg({})).toBe(false);
  });

  it('TWO_FACTOR_REQUIRED lander på /2fa-oppsett — aldri dashboard eller /oppstart', () => {
    expect(destinasjonEtterInvite('owner', '/oppstart', 'TWO_FACTOR_REQUIRED')).toBe(
      '/2fa-oppsett',
    );
    expect(destinasjonEtterInvite('staff', '/innboks', 'TWO_FACTOR_REQUIRED')).toBe('/2fa-oppsett');
    expect(destinasjonEtterInvite('staff', null, 'TWO_FACTOR_REQUIRED')).toBe('/2fa-oppsett');
    expect(destinasjonEtterInvite('staff', '/dashboard', 'annen feil')).toBe('/dashboard');
  });

  it('hent-feil (42883 / ikke-JSON) viser «Klarte ikke hente», API er flertall', () => {
    expect(kilde).toMatch(/fetch\(`\/invitasjoner\/\$\{encodeURIComponent\(token\)\}`\)/);
    expect(kilde).toMatch(/res\.json\(\)\.catch\(\(\) => null\)/);
    expect(kilde).toMatch(/Klarte ikke hente invitasjonen\. Prøv igjen\./);
    expect(kilde).toMatch(/Invitasjonen er ugyldig, brukt eller utløpt\./);
    expect(kilde).not.toMatch(/fetch\(`\/invitasjon\/\$\{/);
  });

  it('fersk invitee går aldri til /signin etter godta + passord', () => {
    expect(kilde).toMatch(/destinasjonEtterInvite/);
    expect(kilde).toMatch(/location\.assign/);
    expect(kilde).toMatch(/twoFactor\.(enable|sendOtp|verifyOtp)/);
    expect(kilde).toMatch(/Bekrefter …/);
    expect(kilde).toMatch(/organization\.setActive/);
    expect(kilde).not.toMatch(/router\.push/);
    expect(kilde).not.toMatch(/if\s*\(\s*!inv\.kreverPassord\s*\)[\s\S]{0,80}\/signin/);
  });

  it('eksisterende konto (/signin) og / sender uferdig 2FA til /2fa-oppsett', () => {
    expect(destinasjonNarSesjonFeiler(new Error('TWO_FACTOR_REQUIRED'))).toBe('/2fa-oppsett');
    expect(destinasjonNarSesjonFeiler(new Error('nettverk nede'))).toBe('/dashboard');
    const signin = readFileSync(resolve(her, '../app/signin/signin-skjema.tsx'), 'utf8');
    const rot = readFileSync(resolve(her, '../app/page.tsx'), 'utf8');
    expect(signin).toMatch(/destinasjonNarSesjonFeiler/);
    expect(rot).toMatch(/destinasjonNarSesjonFeiler/);
    expect(signin).not.toMatch(/catch[\s\S]{0,180}\/dashboard['"]/);
  });

  it('etter OTP rives andre sesjoner, og land() sender 2FA-feil til destinasjonEtterInvite', () => {
    expect(kilde).toMatch(/revokeOtherSessions\s*\(/);
    expect(kilde).not.toMatch(/console\.(log|info|debug)\([^)]*token/i);
    const landStart = kilde.indexOf('async function land');
    const landSlutt = kilde.indexOf('async function startKodeSteg', landStart);
    const land = kilde.slice(landStart, landSlutt);
    expect(land).toMatch(/destinasjonEtterInvite\(/);
    expect(land).toMatch(/TWO_FACTOR_REQUIRED|feil/);
    expect(land).not.toMatch(/catch\s*\(\s*\)\s*=>\s*['"]\/dashboard['"]/);
    expect(land).toMatch(/krevRevokeAndreSesjoner/);
    expect(land).not.toMatch(/\.catch\(\s*\(\)\s*=>\s*undefined\s*\)/);
    expect(land).not.toMatch(/likevel videre/);
  });

  it('revoke-feil etter brukt OTP kan prøves igjen uten ny verifyOtp', () => {
    const start = kilde.indexOf('async function bekreftKode');
    const bekreft = kilde.slice(start, kilde.indexOf('const rolle', start));
    expect(bekreft).toMatch(/otpFerdigRef|otpBekreftet/);
    expect(bekreft).toMatch(/verifyOtp/);
    expect(bekreft).toMatch(/land\(/);
  });

  it('revokeOtherSessions etter invite-OTP feiler lukket — klasse logges, ingen token', async () => {
    expect(feilKlasseUtenHemmelighet(new TypeError('boom'))).toBe('TypeError');
    expect(feilKlasseUtenHemmelighet({ name: 'APIError', message: 'token=abc' })).toBe('APIError');
    expect(REVOKE_ANDRE_SESJONER_UI).not.toMatch(/token/i);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      krevRevokeAndreSesjoner(async () => ({ error: { name: 'APIError' } }), 'invite'),
    ).rejects.toThrow(REVOKE_ANDRE_SESJONER_UI);
    expect(warn).toHaveBeenCalledWith('[invite] revokeOtherSessions feilet', 'APIError');

    await expect(
      krevRevokeAndreSesjoner(async () => ({ error: { code: 'UNAUTHORIZED' } }), 'invite'),
    ).rejects.toThrow(REVOKE_ANDRE_SESJONER_UI);
    expect(warn).toHaveBeenCalledWith('[invite] revokeOtherSessions feilet', 'UNAUTHORIZED');

    await expect(
      krevRevokeAndreSesjoner(async () => ({ error: 'APIError' }), 'invite'),
    ).rejects.toThrow(REVOKE_ANDRE_SESJONER_UI);
    expect(warn).toHaveBeenCalledWith('[invite] revokeOtherSessions feilet', 'APIError');

    await expect(
      krevRevokeAndreSesjoner(async () => {
        throw Object.assign(new Error('session token=hemmelig'), { name: 'FetchError' });
      }, 'invite'),
    ).rejects.toThrow(REVOKE_ANDRE_SESJONER_UI);
    expect(warn).toHaveBeenCalledWith('[invite] revokeOtherSessions feilet', 'FetchError');
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/hemmelig|token=/i);

    await expect(
      krevRevokeAndreSesjoner(async () => ({ error: null }), 'invite'),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('P0: avatar-onboarding dør ikke på 401', () => {
  const kilde = readFileSync(resolve(her, '../app/invitasjon/[token]/page.tsx'), 'utf8');
  const avatar = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');

  it('UNAUTHORIZED og manglende credential blir norsk, aldri rå kodestreng', () => {
    expect(erUautorisert(new Error('UNAUTHORIZED'))).toBe(true);
    expect(erUautorisert({ message: 'UNAUTHORIZED' })).toBe(true);
    expect(erUautorisert({ data: { code: 'UNAUTHORIZED' } })).toBe(true);
    expect(erUautorisert(new Error('Credential account not found'))).toBe(true);
    expect(erUautorisert(new Error('Nettet er nede'))).toBe(false);
    expect(norskAuthFeil(new Error('UNAUTHORIZED'))).toBe(MANGLER_SESJON_UI);
    expect(norskAuthFeil(new Error('UNAUTHORIZED'))).not.toMatch(/UNAUTHORIZED/);
    expect(norskAuthFeil(new Error('Credential account not found'))).toBe(MANGLER_SESJON_UI);
    expect(norskAuthFeil(new Error('Klarte ikke lagre'))).toBe('Klarte ikke lagre');
    expect(destinasjonVedManglendeSesjon()).toBe('/signin');
    expect(MANGLER_SESJON_UI).toMatch(/innlogget|invitasjon/i);
    expect(MANGLER_SESJON_UI).not.toMatch(/UNAUTHORIZED|#EE2924/i);
  });

  it('avatar-steget aktiverer org før tRPC, og 401 sender til /signin', () => {
    const start = kilde.indexOf('async function bekreftKode');
    const bekreft = kilde.slice(start, kilde.indexOf('const rolle', start));
    expect(bekreft).toMatch(/aktiverOrg\(/);
    expect(bekreft.indexOf('aktiverOrg')).toBeLessThan(bekreft.indexOf("setSteg('avatar')"));
    expect(kilde).toMatch(/erUautorisert/);
    expect(kilde).toMatch(/destinasjonVedManglendeSesjon|\/signin/);
    expect(kilde).toMatch(/norskAuthFeil/);
    expect(kilde).not.toMatch(/setFeil\(\(error as Error\)\.message\)/);
  });

  it('Hopp over lander uten å kreve setAvatar når man er innlogget', () => {
    expect(kilde).toMatch(/async function hoppOverAvatar|function hoppOverAvatar/);
    const start = kilde.indexOf('hoppOverAvatar');
    const hopp = kilde.slice(start, kilde.indexOf('const rolle', start));
    expect(hopp).toMatch(/land\(/);
    expect(hopp).not.toMatch(/settAvatar|setAvatar|mutateAsync/);
    expect(kilde).toMatch(/onClick=\{\(\) => void hoppOverAvatar\(\)\}/);
  });

  it('AvatarVelger viser norsk sidetekst, ikke rå UNAUTHORIZED', () => {
    expect(avatar).toMatch(/norskAuthFeil/);
    expect(avatar).not.toMatch(/\{lagre\.error\.message\}/);
  });
});

describe('P0: /oppstart er visningsnavn · avatar · team (tillegg bare hvis åpnet)', () => {
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/page.tsx'), 'utf8');

  it('har avatar-steg med farge, og hopper over tomt tilleggssteg', () => {
    expect(oppstart).toMatch(/Visningsnavn/);
    expect(oppstart).toMatch(/Avatar/);
    expect(oppstart).toMatch(/Team/);
    expect(oppstart).toMatch(/optional\.length/);
    expect(oppstart).toMatch(/AvatarVelger/);
    expect(oppstart).toMatch(/fullforAvatarValg/);
    expect(oppstart).not.toMatch(/STEG = \['Visningsnavn', 'Avatar'/);
    expect(oppstart).not.toMatch(/utledes ansiktet fra navnet/);
  });
});

describe('P0: avatar-velger uten form/humør/tone', () => {
  const avatar = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');
  const profil = readFileSync(resolve(her, '../app/(app)/innstillinger/_profil-fane.tsx'), 'utf8');

  it('profil har velger med farge — uten form, humør og tone', () => {
    expect(profil).toMatch(/AvatarVelger/);
    expect(avatar).toMatch(/Ny tilfeldig/);
    expect(avatar).not.toMatch(/HUMOR\.map/);
    expect(avatar).toMatch(/size = 48/);
    expect(avatar).toMatch(/size=\{size\}/);
    expect(avatar).toMatch(/bevegelse="alltid"/);
    expect(avatar).not.toMatch(/FORMER\.map/);
    expect(avatar).toMatch(/FARGER\.map/);
    expect(avatar).not.toMatch(/TONER\.map/);
    expect(avatar).not.toMatch(/function Nedtrekk/);
    expect(avatar).not.toMatch(/id="humor"/);
    expect(avatar).not.toMatch(/grid grid-cols-2 gap-3 lg:grid-cols-4/);
  });

  it('sidebar-avataren beveger seg hele tiden uten tvunget happy', () => {
    const rad = readFileSync(resolve(her, '../app/(app)/_shell/bruker-rad.tsx'), 'utf8');
    expect(rad).toMatch(/bevegelse="alltid"/);
    expect(rad).toMatch(/valg=\{profil\.data\?\.avatar\}/);
    expect(rad).not.toMatch(/humor:\s*['"]happy['"]/);
  });
});

describe('P0: varslingslyder er en settings-rad', () => {
  const kort = readFileSync(resolve(her, '../app/(app)/_shell/profil-kort.tsx'), 'utf8');

  it('bruker Switch i h-row-store, ikke den tunge knappen', () => {
    expect(kort).toMatch(/from '@endwise\/ui'/);
    expect(kort).toMatch(/<Switch/);
    expect(kort).toMatch(/h-row-store/);
    expect(kort).toMatch(/Varslingslyder/);
    expect(kort).toMatch(/Kort lyd ved ny melding/);
    expect(kort).toMatch(/lyd\.test\(\)/);
    expect(kort).not.toMatch(/border-2/);
    expect(kort).not.toMatch(/size-11/);
    expect(kort).not.toMatch(/cuelume|\.bind\(/);
  });
});

describe('P0: pakkevelger er Stripe-raden', () => {
  const pakke = readFileSync(resolve(her, '../app/(app)/endwise/_pakke-valg.tsx'), 'utf8');
  const forhandlere = readFileSync(
    resolve(her, '../app/(app)/endwise/forhandlere/page.tsx'),
    'utf8',
  );

  it('nivåkort er tre kolonner; tillegg skjuler shop, men ikke SMS', () => {
    expect(pakke).toMatch(/md:grid-cols-3/);
    expect(pakke).toMatch(/bg-accent-soft/);
    expect(pakke).toMatch(/Tillegg som ikke ligger i/);
    expect(pakke).toMatch(/Eieren ser bare disse i oppstart/);
    expect(pakke).toMatch(/t\.module !== 'shop'/);
    expect(pakke).not.toMatch(/t\.module !== 'twilio'/);
    expect(forhandlere).toMatch(/NivaaValg/);
    expect(forhandlere).toMatch(/TilleggListe/);
    expect(forhandlere).toMatch(/optional:\s*\[\.\.\./);
  });
});
