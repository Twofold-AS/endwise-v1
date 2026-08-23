/**
 * F1-10 — hvor en fersk invitee skal etter ekte sesjon (passord + ev. 2FA).
 *
 * ⛔ Hard navigasjon (`location.assign`) skjer i kallstedet, ikke her.
 * Myk klientnavigasjon er dobbel-login-bugen.
 *
 * ⛔ `TWO_FACTOR_REQUIRED` slår `/oppstart` og `session.me.landing`.
 * Uferdig 2FA har ingen autorisert tRPC-sesjon — dashbordet laster ingenting.
 */
export function destinasjonEtterInvite(
  kind: 'owner' | 'staff',
  landing?: string | null,
  feil?: string | null,
): string {
  if (feil?.includes('TWO_FACTOR_REQUIRED')) return '/2fa-oppsett';
  if (kind === 'owner') return '/oppstart';
  if (landing?.startsWith('/') && !landing.startsWith('//')) return landing;
  return '/dashboard';
}

/** Samme regel som `land()` — brukt av `/signin` og `/` etter innlogging. */
export function destinasjonNarSesjonFeiler(error: unknown): string {
  const melding = error instanceof Error ? error.message : String(error);
  return destinasjonEtterInvite('staff', null, melding);
}

export function trengerKodeSteg(input: {
  twoFactorRedirect?: boolean | null;
  feil?: string | null;
}): boolean {
  if (input.twoFactorRedirect === true) return true;
  return Boolean(input.feil?.includes('TWO_FACTOR_REQUIRED'));
}
