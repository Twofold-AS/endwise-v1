import type { Role } from './rbac.ts';
import {
  IDLE_TIMEOUT_SECONDS,
  PLATFORM_ABSOLUTE_MAX_LIFETIME_SECONDS,
  PLATFORM_IDLE_TIMEOUT_SECONDS,
} from './session-policy.ts';

/**
 * F21 / F39 — tre auth-soner.
 * forhandler: kunder på <slug>.endwise.no
 * app: ansatte på app.endwise.no
 * platform: Endwise-team på platform.endwise.no
 */
export type AuthSone = 'forhandler' | 'platform' | 'app';

export const FORHANDLER_COOKIE_PREFIX = 'endwise';
export const PLATFORM_COOKIE_PREFIX = 'endwise-pl';

export const ENDWISE_ROLLER: readonly Role[] = ['endwise_admin', 'endwise_support'];
export const FORHANDLER_ROLLER: readonly Role[] = ['dealer_admin', 'dealer_staff', 'customer'];

export function erEndwiseRolle(role: string | null | undefined): boolean {
  return role === 'endwise_admin' || role === 'endwise_support';
}

export function erForhandlerRolle(role: string | null | undefined): boolean {
  return role === 'dealer_admin' || role === 'dealer_staff' || role === 'customer';
}

export function cookiePrefixForSone(sone: AuthSone): string {
  return sone === 'platform' ? PLATFORM_COOKIE_PREFIX : FORHANDLER_COOKIE_PREFIX;
}

export function idleSekunderForSone(sone: AuthSone): number {
  return sone === 'platform' ? PLATFORM_IDLE_TIMEOUT_SECONDS : IDLE_TIMEOUT_SECONDS;
}

export function absoluttSekunderForSone(sone: AuthSone): number {
  return sone === 'platform' ? PLATFORM_ABSOLUTE_MAX_LIFETIME_SECONDS : 12 * 60 * 60;
}

/**
 * Rolle × sone (ADR-005 / Mons).
 * Endwise-roller får aldri sesjon på forhandlerhost.
 * Forhandlerroller får aldri sesjon på platform.
 * Ukjent/null rolle: nei (samme svar som ukjent bruker).
 */
export function rolleTillattISone(role: string | null | undefined, sone: AuthSone): boolean {
  if (sone === 'platform') return erEndwiseRolle(role);
  if (sone === 'app') return role === 'dealer_admin' || role === 'dealer_staff';
  return erForhandlerRolle(role);
}

/** Header satt av proxy. Klienten kan ikke stole på den uten proxy-rewrite. */
export const SONE_HEADER = 'x-endwise-sone';

export function lesAuthSone(
  headers: Headers,
  _env: Record<string, string | undefined> = process.env,
): AuthSone | null {
  const raw = headers.get(SONE_HEADER)?.trim().toLowerCase();
  if (raw === 'platform') return 'platform';
  if (raw === 'app') return 'app';
  if (raw === 'forhandler') return 'forhandler';
  return null;
}

export function rotDomene(env: Record<string, string | undefined> = process.env): string {
  return (env.TENANT_ROOT_DOMAIN ?? 'endwise.no').replace(/^www\./, '');
}

export function appOffentligUrl(env: Record<string, string | undefined> = process.env): string {
  return `https://app.${rotDomene(env)}`;
}

const FORBUDT_KUNDE_SLUG = new Set(['app', 'platform', 'www', 'api', 'admin']);

export function gyldigForhandlerSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (s.length < 3 || s.length > 32) return false;
  if (FORBUDT_KUNDE_SLUG.has(s) || s === 'endwise' || s.startsWith('endwise-')) return false;
  if (s.includes('.') || s.includes('--')) return false;
  return /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/.test(s);
}

/** Kundevert. Aldri app/platform/apex. */
export function forhandlerOffentligUrl(
  slug: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!gyldigForhandlerSlug(slug)) return null;
  return `https://${slug.trim().toLowerCase()}.${rotDomene(env)}`;
}

/**
 * Flytt en auth-/kunde-lenke til forhandlerverten.
 * Returnerer null hvis slugen er ugyldig eller resultatet ville blitt app/platform.
 */
export function kundelenkePaaForhandler(
  lenke: string,
  slug: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const base = forhandlerOffentligUrl(slug, env);
  if (!base) return null;
  try {
    const src = new URL(lenke);
    const dest = new URL(`${src.pathname}${src.search}${src.hash}`, base);
    if (erAppEllerPlatformHost(dest.hostname, env)) return null;
    return dest.toString();
  } catch {
    return null;
  }
}

export function erAppEllerPlatformHost(
  host: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const rot = rotDomene(env);
  const h = host.replace(/:\d+$/, '').toLowerCase();
  return h === `app.${rot}` || h === `platform.${rot}`;
}

export function platformOffentligUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return `https://platform.${rotDomene(env)}`;
}

export function platformRpId(env: Record<string, string | undefined> = process.env): string {
  try {
    return new URL(platformOffentligUrl(env)).hostname;
  } catch {
    return 'platform.endwise.no';
  }
}
