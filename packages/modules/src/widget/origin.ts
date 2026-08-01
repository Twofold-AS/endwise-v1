/**
 * F4-02 / CWE-346 (Origin Validation) — hvilke nettsteder får bruke en widget-nøkkel.
 *
 * En publishable key er offentlig; origin-allowlisten er det som hindrer at
 * hvem som helst kan hoste embed-en på sitt eget domene og snakke på vegne av
 * forhandleren. Streng: eksakt match på skjema+host(+port), ingen wildcards,
 * ingen delstreng-match (stopper `verksted.no.evil.com`-spoofing).
 */

/** Normaliser en origin til `skjema://host[:port]`, lowercased. Null hvis ugyldig. */
export function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  // `url.host` inkluderer port kun hvis ikke-standard. Path/query/fragment droppes.
  return `${url.protocol}//${url.host}`.toLowerCase();
}

/**
 * Er `origin` blant de tillatte for nøkkelen? Eksakt match etter normalisering.
 * Feiler lukket: ugyldig/manglende origin eller tom allowlist → false.
 */
export function originAllowed(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
): boolean {
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  for (const a of allowedOrigins) {
    if (normalizeOrigin(a) === norm) return true;
  }
  return false;
}
