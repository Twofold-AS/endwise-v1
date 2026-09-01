import { describe, expect, it } from 'vitest';
import { TO_FAKTOR_DISABLE_STI } from '../src/bytt-passord.ts';
import { byttPassordForHook } from '../src/bytt-passord-server.ts';
import { TO_FAKTOR_DISABLE_AUDIT_ACTION } from '../src/to-faktor-oppsett.ts';

/**
 * Slå av 2FA uten passord. Passord er av; sesjonen er allerede TOTP-bevist
 * (eller enroll-sesjon). Audit skrives i etter-hooken.
 */

describe('F1-22: disable uten passord', () => {
  it('serverhooken krever ikke passord på /two-factor/disable', async () => {
    await expect(
      byttPassordForHook({
        path: TO_FAKTOR_DISABLE_STI,
        body: {},
      } as never),
    ).resolves.toBeUndefined();
  });

  it('audit-handlingen er navngitt', () => {
    expect(TO_FAKTOR_DISABLE_AUDIT_ACTION).toBe('two_factor.disabled');
    expect(TO_FAKTOR_DISABLE_STI).toBe('/two-factor/disable');
  });
});
