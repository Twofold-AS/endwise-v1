/**
 * F0-04 — Feature-flags (release-toggles) for web.
 *
 * ⚠️ Vercel Edge Config (BETALT lagring) er FJERNET (brukergodkjent 16.07.2026).
 * `flags`-SDK-en var gratis/OSS — det var Edge Config-lagringen som kostet
 * ($0.000003/lesning, $0.01/skriving på Pro; Hobby: 100k lesninger/100 skrivinger
 * per mnd). Vi eier nå kilden selv: `feature_flags`-tabellen i Postgres, styrt
 * fra admin (flags-tRPC-ruteren, rollestyrt skriving).
 *
 * Dette laget svarer på «har VI rullet ut funksjonen?». «Har forhandleren kjøpt
 * modulen?» besvares av tenant_modules (@endwise/modules -> createEntitlements).
 * Ikke bland dem.
 *
 * Web leser resolverte flagg via `trpc.flags.resolve` når web-tRPC-klienten er
 * wired (samme forutsetning som data-sidene). Inntil da bruker flate-kode disse
 * TRYGGE default-verdiene. Nøkkel-registeret her er kontrakten.
 */
export const FLAG_KEYS = ['kill-switch', 'dev-mode'] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

/**
 * CWE-20 — nøkkel-kontrakten. Serveren (`flagKeySchema` i flags-ruteren)
 * bruker nøyaktig det samme. En sjekk som bare bor i UI-et er ingen sjekk.
 */
export const FLAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const FLAG_KEY_MAX = 64;

/**
 * Fail-safe defaults når backend ikke er tilgjengelig.
 *
 * ⚠️ **`dev-mode` MÅ være `false` her.** Er API-et nede, er dev-mode av — aldri
 * motsatt. En fail-OPEN default på denne nøkkelen ville gjort et driftsavbrudd
 * til en tilgangsutvidelse.
 *
 * Og flagget er uansett bare den FØRSTE av tre betingelser: serveren krever i
 * tillegg `endwise_admin` og `tenants.kind = 'demo'`. Se
 * `apps/api/src/trpc/dev-mode.ts`. Denne fila kan ikke gi noen tilgang; den
 * kan bare skjule noe.
 */
export const FLAG_DEFAULTS: Record<FlagKey, boolean> = {
  'kill-switch': false,
  'dev-mode': false,
};

export function flagDefault(key: FlagKey): boolean {
  return FLAG_DEFAULTS[key];
}

/**
 * Resolver flagg fra en (allerede hentet) resolve-respons fra `trpc.flags.resolve`,
 * med fail-safe fallback til default. Wires når web-tRPC-klienten landes.
 */
export function resolveFlag(key: FlagKey, resolved?: Record<string, boolean>): boolean {
  return resolved?.[key] ?? flagDefault(key);
}
