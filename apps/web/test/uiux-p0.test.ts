import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  destinasjonEtterInvite,
  destinasjonNarSesjonFeiler,
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

  it('fersk invitee går aldri til /signin etter godta + passord', () => {
    expect(kilde).toMatch(/destinasjonEtterInvite/);
    expect(kilde).toMatch(/location\.assign/);
    expect(kilde).toMatch(/twoFactor\.(enable|sendOtp|verifyOtp)/);
    expect(kilde).toMatch(/Bekrefter …/);
    expect(kilde).toMatch(/organization\.setActive/);
    expect(kilde).not.toMatch(/router\.push/);
    // kreverPassord:false (eksisterende konto) får /signin — det er OK.
    expect(kilde).toMatch(/kreverPassord[\s\S]*\/signin/);
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
  });
});

describe('P0: /oppstart er visningsnavn · team (tillegg bare hvis åpnet)', () => {
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/page.tsx'), 'utf8');

  it('har ikke avatar-steg og hopper over tomt tilleggssteg', () => {
    expect(oppstart).toMatch(/Visningsnavn/);
    expect(oppstart).toMatch(/Team/);
    expect(oppstart).toMatch(/optional\.length/);
    expect(oppstart).not.toMatch(/AvatarVelger/);
    expect(oppstart).not.toMatch(/STEG = \['Visningsnavn', 'Avatar'/);
    expect(oppstart).not.toMatch(/Hopp over/);
  });
});

describe('P0: avatar er én blobatar, alltid happy', () => {
  const avatar = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');
  const profil = readFileSync(resolve(her, '../app/(app)/innstillinger/profil/page.tsx'), 'utf8');

  it('profil har velger uten fire nedtrekk', () => {
    expect(profil).toMatch(/AvatarVelger/);
    expect(avatar).toMatch(/Ny tilfeldig/);
    expect(avatar).toMatch(/humor:\s*['"]happy['"]/);
    expect(avatar).toMatch(/size=\{48\}/);
    expect(avatar).toMatch(/bevegelse="hover"/);
    expect(avatar).not.toMatch(/function Nedtrekk/);
    expect(avatar).not.toMatch(/id="humor"/);
    expect(avatar).not.toMatch(/grid grid-cols-2 gap-3 lg:grid-cols-4/);
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
