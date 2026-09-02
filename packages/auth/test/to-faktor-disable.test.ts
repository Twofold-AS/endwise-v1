import { describe, expect, it } from 'vitest';
import { BYTT_EPOST_STI } from '../src/bytt-epost.ts';
import {
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_SEND_OTP_STI,
  TO_FAKTOR_VERIFY_BACKUP_STI,
  TO_FAKTOR_VERIFY_TOTP_STI,
} from '../src/bytt-passord.ts';
import { byttPassordForHook } from '../src/bytt-passord-server.ts';
import { TO_FAKTOR_DISABLE_AUDIT_ACTION } from '../src/to-faktor-oppsett.ts';
import { TOTP_STEP_UP_KODE } from '../src/totp-steg.ts';

describe('F1-22: selvbetjent disable er stengt (Mons)', () => {
  it('serverhooken nekter /two-factor/disable', async () => {
    await expect(
      byttPassordForHook({
        path: TO_FAKTOR_DISABLE_STI,
        body: {},
      } as never),
    ).rejects.toMatchObject({
      status: 'FORBIDDEN',
      body: { code: 'TWO_FACTOR_DISABLE_FORBIDDEN' },
    });
  });

  it('e-post-OTP-sti er stengt', async () => {
    await expect(
      byttPassordForHook({
        path: TO_FAKTOR_SEND_OTP_STI,
        body: {},
      } as never),
    ).rejects.toMatchObject({ status: 'FORBIDDEN', body: { code: 'TWO_FACTOR_OTP_DISABLED' } });
  });

  it('trustDevice tvinges av på TOTP og backup-verify', async () => {
    const totp = await byttPassordForHook({
      path: TO_FAKTOR_VERIFY_TOTP_STI,
      body: { code: '123456', trustDevice: true },
    } as never);
    expect(totp).toEqual({
      context: { body: { code: '123456', trustDevice: false } },
    });
    const backup = await byttPassordForHook({
      path: TO_FAKTOR_VERIFY_BACKUP_STI,
      body: { code: 'aaaaa-bbbbb', trustDevice: true },
    } as never);
    expect(backup).toEqual({
      context: { body: { code: 'aaaaa-bbbbb', trustDevice: false } },
    });
  });

  it('⛔ change-email uten fersk TOTP er 403 selv med 2FA på', async () => {
    await expect(
      byttPassordForHook({
        path: BYTT_EPOST_STI,
        body: { newEmail: 'ny@test.no' },
        context: {
          session: {
            user: { id: 'u1', twoFactorEnabled: true },
            session: { token: 't', userId: 'u1' },
          },
          adapter: { findOne: async () => null },
        },
        getSignedCookie: async () => null,
      } as never),
    ).rejects.toMatchObject({
      status: 'FORBIDDEN',
      body: { code: TOTP_STEP_UP_KODE },
    });
  });

  it('audit-handlingen er navngitt (team-reset skriver den)', () => {
    expect(TO_FAKTOR_DISABLE_AUDIT_ACTION).toBe('two_factor.disabled');
    expect(TO_FAKTOR_DISABLE_STI).toBe('/two-factor/disable');
  });
});
