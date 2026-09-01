import { createOTP } from '@better-auth/utils/otp';
import { type Database, eq, schema } from '@endwise/db';
import { symmetricDecrypt } from 'better-auth/crypto';
import { krevFerskTotpFraBody, TOTP_STEP_UP_KODE, TOTP_STEP_UP_MELDING } from './totp-steg.ts';

/**
 * TOTP-step-up uten Better-Auth-hook-ctx (tRPC: e-postbytte, leder-reset).
 */
export async function verifiserFerskTotpForBruker(
  db: Database,
  userId: string,
  body: unknown,
  secretKey: string,
): Promise<void> {
  const totp = krevFerskTotpFraBody(body);
  const [twoFactor] = await db
    .select({ secret: schema.twoFactor.secret })
    .from(schema.twoFactor)
    .where(eq(schema.twoFactor.userId, userId))
    .limit(1);
  if (!twoFactor?.secret) {
    throw krevFerskTotpFraBody({});
  }
  const secret = await symmetricDecrypt({
    key: secretKey as Parameters<typeof symmetricDecrypt>[0]['key'],
    data: twoFactor.secret,
  });
  const ok = await createOTP(secret, { period: 30, digits: 6 }).verify(totp);
  if (!ok) {
    throw krevFerskTotpFraBody({});
  }
}

export { TOTP_STEP_UP_KODE, TOTP_STEP_UP_MELDING };
