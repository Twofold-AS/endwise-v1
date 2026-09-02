import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { velgAktivOrganisasjon } from '../src/aktiv-org.ts';
import { KREDENTIAL_MUTASJON_GENERISK_MELDING } from '../src/bytt-passord.ts';
import { norskTotpEnableFeil } from '../src/totp-enable-feil.ts';
import { sessionMeTwoFactorRequired } from '../src/two-factor.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('TOTP enable med ekte sesjon (Mikael 02.09)', () => {
  it('uenrollert session.me-felt er ikke twoFactorRequired', () => {
    expect(sessionMeTwoFactorRequired({ twoFactorEnabled: false })).toBe(false);
    expect(sessionMeTwoFactorRequired({ twoFactorEnabled: null })).toBe(false);
    expect(sessionMeTwoFactorRequired({ twoFactorEnabled: true })).toBe(false);
  });

  it('before-hook på enable returnerer når sesjon finnes — uten enroll-kake', () => {
    const hook = les('../src/bytt-passord-server.ts');
    expect(hook).toMatch(/TO_FAKTOR_ENABLE_STI/);
    expect(hook).toMatch(/getSessionFromCtx/);
    expect(hook).toMatch(/if \(innlogget\?\.user\?\.id\) return/);
  });

  it('etter-hook skjuler bare bytt-passord — ikke two-factor/enable', () => {
    const hook = les('../src/bytt-passord-server.ts');
    const etter = hook.slice(hook.indexOf('export function createByttPassordEtterHook'));
    expect(etter).toMatch(/ctx\.path === BYTT_PASSORD_STI &&/);
    expect(etter).toMatch(/erSkjultAuthFeilkode\(feilkodeFraReturned/);
    expect(etter).toMatch(/generiskAuthFeilForSti\(ctx\.path\)/);
    expect(etter).not.toMatch(/if \(erSkjultAuthFeilkode\(feilkodeFraReturned/);
  });

  it('norskTotpEnableFeil er konkret — aldri den generiske setningen', () => {
    expect(norskTotpEnableFeil({ code: 'INVALID_PASSWORD' })).not.toBe(
      KREDENTIAL_MUTASJON_GENERISK_MELDING,
    );
    expect(norskTotpEnableFeil({ message: 'INVALID_ORIGIN' })).toMatch(/adresse|opprinnelse|last/i);
    expect(norskTotpEnableFeil({ code: 'UNAUTHORIZED' })).toMatch(
      /Logg inn først|innlogget|sesjon/i,
    );
    expect(norskTotpEnableFeil({ message: 'CSRF token mismatch' })).toMatch(/last|prøv/i);
    expect(norskTotpEnableFeil({ message: 'Kunne ikke bekrefte handlingen.' })).not.toBe(
      KREDENTIAL_MUTASJON_GENERISK_MELDING,
    );
  });

  it('velgAktivOrganisasjon foretrekker Endwise-plattform', () => {
    expect(
      velgAktivOrganisasjon([
        { id: 'd1', slug: 'oslo-mc', role: 'dealer_staff' },
        { id: 'e1', slug: 'endwise', role: 'endwise_admin' },
      ]),
    ).toBe('e1');
    expect(velgAktivOrganisasjon([{ id: 'd1', slug: 'oslo-mc', role: 'dealer_admin' }])).toBe('d1');
    expect(velgAktivOrganisasjon([])).toBeNull();
  });
});
