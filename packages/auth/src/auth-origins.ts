import { devTrustedOrigins } from './dev-origins.ts';

/**
 * F1-01 / F13 — offentlige auth-URL-er og betrodde origins.
 *
 * ── Problemet dette løser ─────────────────────────────────────────────────
 * `devTrustedOrigins` ble bare sendt inn når `NODE_ENV !== 'production'`.
 * Vercel preview og alias-hoster kjører `NODE_ENV=production`, så de fikk
 * ingen ekstra origins — bare `BETTER_AUTH_URL` som `baseURL`. Åpnet du
 * deployet på en annen vert enn den URL-en, svarte Better-Auth
 * `403 Invalid origin`. Det var det som skjedde da
 * `https://endwise-v1-web.vercel.app` feilet mens
 * `https://endwise-v1-web-endwise-twofold.vercel.app` virket fordi den
 * tilfeldigvis var `BETTER_AUTH_URL`.
 *
 * ── Hva som er betrodd ────────────────────────────────────────────────────
 * Bare navngitte verter: produktvertene + det Vercel allerede setter
 * (`VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`) +
 * `BETTER_AUTH_URL` / derived base URL. Ingen `*.vercel.app`.
 *
 * ── Preview vs prod ──────────────────────────────────────────────────────
 * Preview skal IKKE arve produksjons-`BETTER_AUTH_URL`. Det splitter
 * cookie og origin: resetlenker og sesjoner hører til den hosten
 * deployet faktisk serveres på.
 */

/** Apex + www. www er valgfri DNS; å betro den unngår 403 hvis den tas i bruk. */
export const PRODUKT_ORIGINS = ['https://endwise.no', 'https://www.endwise.no'] as const;

export type AuthOriginEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  BETTER_AUTH_URL?: string;
};

function harJokertegn(verdi: string): boolean {
  return verdi.includes('*');
}

/** Absolutt URL → origin, med original protokoll (localhost er http). */
function originFraAbsoluttUrl(verdi: string | undefined): string | null {
  if (!verdi) return null;
  const trimmet = verdi.trim();
  if (!trimmet || harJokertegn(trimmet)) return null;
  try {
    const url = new URL(trimmet);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Vercel-systemvariabler er host uten skjema (iblant med https://).
 * Alltid https — Vercel serverer ikke http.
 */
function httpsOrigin(verdi: string | undefined): string | null {
  if (!verdi) return null;
  const trimmet = verdi.trim();
  if (!trimmet || harJokertegn(trimmet)) return null;
  try {
    const url = trimmet.includes('://') ? new URL(trimmet) : new URL(`https://${trimmet}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    url.protocol = 'https:';
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Offentlig base-URL for denne kjøringen.
 *
 * Preview: `https://${VERCEL_URL}` — ikke produksjonsdomenet.
 * Prod (eller NODE_ENV=production uten preview): `BETTER_AUTH_URL`, påkrevd.
 * Dev: `BETTER_AUTH_URL` / localhost, som før.
 */
export function authPublicUrl(env: AuthOriginEnv = process.env): string {
  if (env.VERCEL_ENV === 'preview') {
    const origin = httpsOrigin(env.VERCEL_URL);
    if (!origin) {
      throw new Error('Miljøvariabel mangler: VERCEL_URL');
    }
    return origin;
  }
  const raw = env.BETTER_AUTH_URL?.trim();
  if (!raw) {
    throw new Error('Miljøvariabel mangler: BETTER_AUTH_URL');
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Origins Better-Auth skal godta for denne kjøringen.
 *
 * Kjører i prod, preview og dev — ikke bare lokalt. LAN/localhost bare
 * når `NODE_ENV !== 'production'`.
 */
export function authTrustedOrigins(env: AuthOriginEnv = process.env): string[] {
  const ut = new Set<string>();

  const better = originFraAbsoluttUrl(env.BETTER_AUTH_URL);
  if (better) ut.add(better);

  try {
    const derived = originFraAbsoluttUrl(authPublicUrl(env));
    if (derived) ut.add(derived);
  } catch {
    // Mangler base-URL — produktvertene og navngitte Vercel-verter står igjen.
  }

  for (const origin of PRODUKT_ORIGINS) ut.add(origin);

  const vercelUrl = httpsOrigin(env.VERCEL_URL);
  if (vercelUrl) ut.add(vercelUrl);
  const branchUrl = httpsOrigin(env.VERCEL_BRANCH_URL);
  if (branchUrl) ut.add(branchUrl);
  const prodUrl = httpsOrigin(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (prodUrl) ut.add(prodUrl);

  if (env.NODE_ENV !== 'production') {
    for (const origin of devTrustedOrigins()) ut.add(origin);
  }

  return [...ut];
}
