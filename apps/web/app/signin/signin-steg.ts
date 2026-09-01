/**
 * Innlogging etter identifisert e-post: venteskjerm, ikke TOTP-vegg.
 * Magic-lenka og den manuelle koden er samme engangsbevis.
 * TOTP-flaten vises bare når Better-Auth allerede har satt two_factor-kaken
 * (appen er bundet). Uenrollert lander aldri på «Bekreft med autentikator».
 */

export const SIGNIN_STI = '/signin';
export const SIGNIN_VALG_STI = '/signin?steg=valg';
export const SIGNIN_TOTP_STI = '/signin?steg=totp';
export const SIGNIN_ENROLL_STI = '/2fa-oppsett';
export const SIGNIN_EPOST_KEY = 'endwise.signin.epost';

export const SIGNIN_VENT_TITTEL = 'Trykk på lenken i e-posten';
export const SIGNIN_VALG_SKRIV_KODE = 'Skriv kode manuelt';
export const SIGNIN_VALG_BYTT_KONTO = 'Bytt konto';
export const SIGNIN_VALG_LOGG_INN = 'Logg inn';
export const SIGNIN_VALG_SEND_NYTT = 'Send på nytt';

export type SignInFlate = 'epost' | 'valg' | 'totp';
export type SignInEtterLenke = SignInFlate | 'enroll';

/**
 * `steg=totp` i URL-en er ikke nok. Preview/historikk kan etterlate queryen
 * etter Fortsett (replaceState oppdaterer ikke Next searchParams), og da
 * må vi IKKE vise app-kode til noen som ikke har two_factor-kake.
 */
export function harTotpVindu(cookieHeader = ''): boolean {
  return /(?:^|;\s*)(?:__Secure-|__Host-)?(?:endwise\.)?two_factor=/.test(cookieHeader);
}

export function harEnrollVindu(cookieHeader = ''): boolean {
  return /(?:^|;\s*)(?:__Secure-|__Host-)?(?:endwise\.)?enroll_2fa=/.test(cookieHeader);
}

/**
 * Etter magic-link-verify: HttpOnly-kaker (two_factor / enroll_2fa) er
 * sannheten — ikke document.cookie og ikke error-query. Tokenet er allerede
 * brukt. Venteskjerm her er løkken «lenken dreper seg selv».
 */
export function flateEtterMagicLinkLanding(input: {
  steg?: string | null;
  feil?: string | null;
  totpKlar: boolean;
  enrollKlar: boolean;
}): SignInEtterLenke {
  if (input.enrollKlar) return 'enroll';
  if (input.totpKlar) return 'totp';
  if (input.feil) return 'valg';
  return signInFlateFraQuery(input.steg, { totpKlar: false });
}

export function signInFlateFraQuery(
  steg: string | null | undefined,
  opts?: { totpKlar?: boolean },
): SignInFlate {
  if (steg === 'totp' && opts?.totpKlar === true) return 'totp';
  if (steg === 'valg' || steg === 'sendt' || steg === 'totp') return 'valg';
  return 'epost';
}

export function meldingForTotpFeil(error?: { code?: string; message?: string } | null): string {
  const kode = error?.code ?? '';
  const melding = error?.message ?? '';
  if (kode === 'TOTP_NOT_ENABLED' || /TOTP not enabled/i.test(melding)) {
    return 'Autentikator er ikke satt opp ennå. Trykk på lenken i e-posten først.';
  }
  if (kode === 'INVALID_TWO_FACTOR_COOKIE' || /invalid two factor cookie/i.test(melding)) {
    return 'Sesjonen for app-koden er utløpt. Trykk på lenken i e-posten på nytt.';
  }
  return 'Feil eller utløpt app-kode. Prøv igjen.';
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
