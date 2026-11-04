import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { kanAapneBedrift } from '../src/kontekst.ts';
import { MAGIC_LINK_APP_LANDING, MAGIC_LINK_ENROLL_STI } from '../src/magic-link.ts';
import { etterMagicLinkVerify } from '../src/magic-link-2fa.ts';
import { assertTwoFactorSatisfied, sessionMeTwoFactorRequired } from '../src/two-factor.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-11: passnøkkel er andre faktor, ikke TOTP', () => {
  it('bedrift uten passnøkkel tvinges til /2fa-oppsett uten utlogging', () => {
    expect(etterMagicLinkVerify(false, { aktiv: false, harRolle: true, kreverTotp: true })).toEqual(
      { handling: 'behold-sesjon', dest: MAGIC_LINK_ENROLL_STI },
    );
    expect(etterMagicLinkVerify(true, { aktiv: false, harRolle: true, kreverTotp: true })).toEqual({
      handling: 'behold-sesjon',
      dest: MAGIC_LINK_APP_LANDING,
    });
    expect(MAGIC_LINK_ENROLL_STI).toBe('/2fa-oppsett');
  });

  it('TOTP-flagg teller ikke som andre faktor', () => {
    expect(sessionMeTwoFactorRequired({ twoFactorEnabled: true, roles: ['dealer_admin'] })).toBe(
      true,
    );
    expect(sessionMeTwoFactorRequired({ harPasskey: true, roles: ['dealer_admin'] })).toBe(false);
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['endwise_admin'], twoFactorEnabled: true }),
    ).toThrow();
    expect(kanAapneBedrift({ harRolle: true, totpBundet: true })).toBe(false);
    expect(kanAapneBedrift({ harRolle: true, harPasskey: true })).toBe(true);
  });

  it('passkey-plugin lastes på app og forhandler, ikke bare platform', () => {
    const auth = les('../src/auth.ts');
    const plugin = les('../src/passkey-plugin.ts');
    expect(auth).toMatch(/passkeyPlugin\(\{ sone, slug: opts\?\.slug \}\)/);
    expect(auth).not.toMatch(/\.\.\.\(platform \? \[passkeyPlugin/);
    expect(plugin).toMatch(/sone === 'app'/);
    expect(plugin).toMatch(/sone === 'forhandler'/);
    expect(plugin).toMatch(/rpID/);
  });

  it('verify-hook bruker brukerHarPasskey og river aldri for TOTP', () => {
    const hook = les('../src/magic-link-2fa.ts');
    expect(hook).toMatch(/brukerHarPasskey/);
    expect(hook).not.toMatch(/startTotp/);
    expect(hook).not.toMatch(/totp-mur/);
    expect(hook).toMatch(/behold-sesjon/);
  });
});
