/**
 * F1-16 — les reset-tokenet fra query, og behold det første som finnes.
 *
 * ── Hvorfor denne fila finnes ────────────────────────────────────────────
 * `/nytt-passord` stryker `?token=` med `history.replaceState` så nøkkelen
 * ikke blir liggende i adressefeltet. `useSearchParams` oppdateres da til
 * tom query, og en effekt som gjør `setToken(params.get('token') ?? null)`
 * tømmer tokenet på andre runde. Skjemaet forsvinner. Feilen er den
 * avhengigheten, ikke at tokenet manglet i e-posten.
 *
 * ⛔ Ingen verify-kall her. Å spørre serveren «finnes dette tokenet?» før
 * innsending er et orakel. Gyldighet avgjøres når passordet sendes inn.
 *
 * ⛔ Tokenet logges aldri. Det er nøkkelen til kontoen.
 */

type Query = { get(name: string): string | null } | null | undefined;

/** Better Auth + vår `sendResetPassword` bruker `token`. De andre er fallback. */
const TOKEN_PARAMETRE = ['token', 'token_hash', 'hash'] as const;

export function lesResetToken(params: Query): string | null {
  if (!params) return null;
  for (const nøkkel of TOKEN_PARAMETRE) {
    const verdi = params.get(nøkkel)?.trim();
    if (verdi) return verdi;
  }
  return null;
}

/** Better Auths redirect-endepunkt kan sende `?error=INVALID_TOKEN`. */
export function resetLenkeFeil(params: Query): string | null {
  const feil = params?.get('error')?.trim();
  return feil || null;
}

/** Første ikke-tomme token vinner. Tom query etter strip tømmer det ikke. */
export function beholdForsteToken(forrige: string | null, neste: string | null): string | null {
  return forrige ?? neste;
}
