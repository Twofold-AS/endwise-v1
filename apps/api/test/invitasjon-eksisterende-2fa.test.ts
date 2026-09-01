import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES_REQUIRING_2FA } from '@endwise/auth';
import { describe, expect, it } from 'vitest';

/**
 * P0 28.08.2026 — eksisterende bruker som godtar invitasjon.
 * Hullet: GET satte kreverPassord=false, UI hoppet til /signin uten OTP,
 * godta skrev ikke e-post/mechanics og lot eksisterende medlemskap stå.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('P0: eksisterende bruker må gjennom 2FA ved invitasjon', () => {
  const rute = les('../src/routes/invitasjon.ts');
  const side = les('../../web/app/invitasjon/[token]/page.tsx');

  it('dealer_staff, dealer_admin og endwise_* krever 2FA', () => {
    expect(ROLES_REQUIRING_2FA).toEqual([
      'dealer_admin',
      'dealer_staff',
      'endwise_admin',
      'endwise_support',
    ]);
  });

  it('GET krever aldri passord — 2FA-flagget følger rollen', () => {
    expect(rute).toMatch(/rolleKrever2FA|ROLES_REQUIRING_2FA/);
    expect(rute).toMatch(/krever2FA/);
    expect(rute).toMatch(/kreverPassord:\s*false/);
    expect(rute).not.toMatch(/kreverPassord:\s*inv\.kind === 'owner' \|\| !eksisterende/);
    expect(rute).not.toMatch(/const kreverPassord = inv\.kind === 'owner' \|\| !eksisterende/);
  });

  it('godta skriver e-post og oppdaterer rollen uten passord', () => {
    expect(rute).toMatch(/email:\s*inv\.epost|email:\s*invitasjon\.epost/);
    expect(rute).toMatch(/emailVerified:\s*true/);
    expect(rute).toMatch(/update\(schema\.member\)|role:\s*inv\.rolle/);
    expect(rute).toMatch(/schema\.mechanics/);
    expect(rute).toMatch(/funksjon === 'mekaniker'|inv\.funksjon === 'mekaniker'/);
    expect(rute).not.toMatch(/settPassordUtenSesjon/);
    expect(rute).not.toMatch(/UNAUTHORIZED/);
  });

  it('invite-siden sender magic link — ikke passord + e-post-OTP', () => {
    expect(side).toMatch(/signIn\.magicLink|magicLink/);
    expect(side).not.toMatch(/twoFactor\.(enable|sendOtp|verifyOtp)/);
    expect(side).not.toMatch(/if\s*\(\s*!inv\.kreverPassord\s*\)[\s\S]{0,80}\/signin/);
    expect(side).not.toMatch(/konto eksisterer fra før/);
  });
});
