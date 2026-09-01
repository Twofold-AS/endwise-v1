/**
 * Innloggingsflater. Uenrollert skal aldri møte en kode-vegg som eneste vei.
 * `?steg=totp` = serveren har bekreftet twoFactorEnabled etter magic link.
 * `?steg=valg` = e-post er identifisert; alle tre valg er synlige.
 */

export const SIGNIN_STI = '/signin';
export const SIGNIN_VALG_STI = '/signin?steg=valg';
export const SIGNIN_TOTP_STI = '/signin?steg=totp';
export const SIGNIN_EPOST_KEY = 'endwise.signin.epost';

export const SIGNIN_VALG_SKRIV_KODE = 'Skriv inn kode';
export const SIGNIN_VALG_MAGICLINK = 'Logg inn med magiclink';
export const SIGNIN_VALG_BYTT_KONTO = 'Bytt konto';

export type SignInFlate = 'epost' | 'valg';

export function signInFlateFraQuery(steg: string | null | undefined): SignInFlate {
  if (steg === 'totp' || steg === 'valg' || steg === 'sendt') return 'valg';
  return 'epost';
}

/** TOTP-feltet er aktivt bare når magic-link-hooken har bekreftet enrollment. */
export function totpFeltAktivt(steg: string | null | undefined): boolean {
  return steg === 'totp';
}

export function trengerEnrollForklaring(steg: string | null | undefined): boolean {
  return !totpFeltAktivt(steg);
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
