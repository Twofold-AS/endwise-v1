import { APIError } from 'better-auth/api';

export const TOTP_STEP_UP_KODE = 'TOTP_STEP_UP_REQUIRED';
export const TOTP_STEP_UP_MELDING = 'Skriv en fersk kode fra autentikator-appen.';

export function krevFerskTotpFraBody(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    throw new APIError('FORBIDDEN', {
      message: TOTP_STEP_UP_MELDING,
      code: TOTP_STEP_UP_KODE,
    });
  }
  const raw = 'totp' in body ? body.totp : undefined;
  const totp = typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
  if (!/^\d{6}$/.test(totp)) {
    throw new APIError('FORBIDDEN', {
      message: TOTP_STEP_UP_MELDING,
      code: TOTP_STEP_UP_KODE,
    });
  }
  return totp;
}
