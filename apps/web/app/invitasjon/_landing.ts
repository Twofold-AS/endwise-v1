export {
  destinasjonVedManglendeSesjon,
  erUautorisert,
  MANGLER_SESJON_UI,
  norskAuthFeil,
} from '../_auth/feil';

/**
 * Hvor en fersk invitee skal etter ekte sesjon (passord + ev. 2FA).
 * Hard navigasjon (`location.assign`) skjer i kallstedet, ikke her.
 * Myk klientnavigasjon er dobbel-login-bugen.
 * `TWO_FACTOR_REQUIRED` slår `/oppstart` og `session.me.landing`.
 * Uferdig 2FA har ingen autorisert tRPC-sesjon — dashbordet laster ingenting.
 */
export function destinasjonEtterInvite(
  kind: 'owner' | 'staff' | 'platform',
  landing?: string | null,
  feil?: string | null,
): string {
  if (feil?.includes('TWO_FACTOR_REQUIRED')) return '/2fa-oppsett';
  if (kind === 'platform') return '/endwise';
  if (kind === 'owner') return '/oppstart';
  if (landing?.startsWith('/') && !landing.startsWith('//')) return landing;
  return '/dashboard';
}

/** Samme regel som `land` — brukt av `/signin` og `/` etter innlogging. */
export function destinasjonNarSesjonFeiler(error: unknown): string {
  const melding = error instanceof Error ? error.message : String(error);
  return destinasjonEtterInvite('staff', null, melding);
}

export function trengerKodeSteg(input: {
  twoFactorRedirect?: boolean | null;
  feil?: string | null;
}): boolean {
  // twoFactorRedirect = already enrolled, pending TOTP after magic link.
  // TWO_FACTOR_REQUIRED = not enrolled → /2fa-oppsett, never a code wall.
  if (input.feil?.includes('TWO_FACTOR_REQUIRED')) return false;
  return input.twoFactorRedirect === true;
}

/** Trygg UI-tekst når `revokeOtherSessions` feiler etter invite-OTP. Ingen token. */
export const REVOKE_ANDRE_SESJONER_UI =
  'Kunne ikke avslutte andre innloggede økter. Prøv igjen før du går videre.';

/** Bare konstruktørnavn / type — aldri message (kan inneholde token). */
export function feilKlasseUtenHemmelighet(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    typeof error.name === 'string' &&
    error.name.length > 0
  ) {
    return error.name;
  }
  return typeof error;
}

type AuthKlientFeil = { name?: string; code?: string };

function authKlientFeil(res: unknown): AuthKlientFeil | null {
  if (!res || typeof res !== 'object' || !('error' in res)) return null;
  const err = res.error;
  if (err == null) return null;
  if (typeof err === 'string' && err.length > 0) return { name: err };
  if (typeof err === 'object') return err as AuthKlientFeil;
  return { name: 'AuthClientError' };
}

function klasseFraAuthFeil(error: AuthKlientFeil): string {
  if (error.name && error.name.length > 0) return error.name;
  if (error.code && error.code.length > 0) return error.code;
  return 'AuthClientError';
}

/**
 * CWE-613 — etter invite-OTP: riv andre sesjoner, eller stopp.
 * Better-Auth returnerer `{ data } | { error: { code, message } }` uten å kaste.
 * Begge stier feiler lukket. Logger bare klasse/kode — aldri message/token.
 */
export async function krevRevokeAndreSesjoner(
  revoke: () => Promise<unknown>,
  kilde: string,
): Promise<void> {
  try {
    const feil = authKlientFeil(await revoke());
    if (feil) {
      console.warn(`[${kilde}] revokeOtherSessions feilet`, klasseFraAuthFeil(feil));
      throw new Error(REVOKE_ANDRE_SESJONER_UI);
    }
  } catch (error) {
    if (error instanceof Error && error.message === REVOKE_ANDRE_SESJONER_UI) throw error;
    console.warn(`[${kilde}] revokeOtherSessions feilet`, feilKlasseUtenHemmelighet(error));
    throw new Error(REVOKE_ANDRE_SESJONER_UI);
  }
}
