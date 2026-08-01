/**
 * F4-02 / CWE-770 — Rate-limiting for de OFFENTLIGE, uautentiserte widget-
 * endepunktene. Anonyme kan spamme (booking-spam, AI-kostnad, enumererings-
 * forsøk), så hvert widget-endepunkt må ha et tak.
 *
 * Fast-vindu-teller i minnet: enkelt, ingen avhengighet, godt nok per instans.
 * MERK (drift): dette er PER prosess/instans. Ved horisontal skalering trengs en
 * delt teller (Redis/Upstash) for et globalt tak — dokumentert som TODO. Taket
 * her stopper uansett den enkeltinstans-flommen som er den realistiske trusselen.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Ms til vinduet nullstilles. */
  resetMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  /** Fjern utløpte bøtter (kan kalles periodisk for å hindre minnevekst). */
  sweep(): void;
  readonly size: number;
}

/**
 * `windowMs`: vinduslengde. `max`: tillatte treff per nøkkel per vindu.
 * Nøkkelen bør kombinere endepunkt + identitet (tenant/kunde/IP).
 */
export function createRateLimiter(opts: { windowMs: number; max: number }): RateLimiter {
  const { windowMs, max } = opts;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || now >= b.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1, resetMs: windowMs };
      }
      if (b.count >= max) {
        return { allowed: false, remaining: 0, resetMs: b.resetAt - now };
      }
      b.count += 1;
      return { allowed: true, remaining: max - b.count, resetMs: b.resetAt - now };
    },
    sweep() {
      const now = Date.now();
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) buckets.delete(k);
      }
    },
    get size() {
      return buckets.size;
    },
  };
}
