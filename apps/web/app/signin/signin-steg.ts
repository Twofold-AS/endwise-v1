/**
 * Innlogging etter identifisert e-post: to knapper.
 * Magic-lenka og den manuelle koden er samme engangsbevis.
 */

export const SIGNIN_STI = '/signin';
export const SIGNIN_VALG_STI = '/signin?steg=valg';
export const SIGNIN_TOTP_STI = '/signin?steg=totp';
export const SIGNIN_EPOST_KEY = 'endwise.signin.epost';

export const SIGNIN_VALG_SKRIV_KODE = 'Skriv kode manuelt';
export const SIGNIN_VALG_BYTT_KONTO = 'Bytt konto';

export type SignInFlate = 'epost' | 'valg' | 'totp';

export function signInFlateFraQuery(steg: string | null | undefined): SignInFlate {
  if (steg === 'totp') return 'totp';
  if (steg === 'valg' || steg === 'sendt') return 'valg';
  return 'epost';
}

export function lagreIdentifisertEpost(epost: string): void {
  const trimmet = epost.trim();
  if (typeof sessionStorage === 'undefined') return;
  if (trimmet) sessionStorage.setItem(SIGNIN_EPOST_KEY, trimmet);
  else sessionStorage.removeItem(SIGNIN_EPOST_KEY);
}

export function lesIdentifisertEpost(): string {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(SIGNIN_EPOST_KEY)?.trim() ?? '';
}

export function toemIdentifisertEpost(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SIGNIN_EPOST_KEY);
}
