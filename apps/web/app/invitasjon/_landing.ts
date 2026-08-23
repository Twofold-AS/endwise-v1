/**
 * F1-10 — hvor en fersk invitee skal etter ekte sesjon (passord + ev. 2FA).
 *
 * ⛔ Hard navigasjon (`location.assign`) skjer i kallstedet, ikke her.
 * Myk klientnavigasjon er dobbel-login-bugen.
 */
export function destinasjonEtterInvite(kind: 'owner' | 'staff', landing?: string | null): string {
  if (kind === 'owner') return '/oppstart';
  if (landing?.startsWith('/') && !landing.startsWith('//')) return landing;
  return '/dashboard';
}

export function trengerKodeSteg(input: {
  twoFactorRedirect?: boolean | null;
  feil?: string | null;
}): boolean {
  if (input.twoFactorRedirect === true) return true;
  return Boolean(input.feil?.includes('TWO_FACTOR_REQUIRED'));
}
