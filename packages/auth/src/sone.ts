import type { Role } from './rbac.ts';
import {
  IDLE_TIMEOUT_SECONDS,
  PLATFORM_ABSOLUTE_MAX_LIFETIME_SECONDS,
  PLATFORM_IDLE_TIMEOUT_SECONDS,
} from './session-policy.ts';

/**
 * F21 / white label F5 — to auth-soner.
 * forhandler: kunder og ansatte på &lt;slug&gt;.endwise.no
 * platform: kun Endwise-team på platform.endwise.no
 * Uten ENDWISE_WHITE_LABEL brukes dagens éne instans (prefiks `endwise`).
 */
export type AuthSone = 'forhandler' | 'platform';

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
  return erForhandlerRolle(role);
}

/** Header satt av proxy. Klienten kan ikke stole på den uten proxy-rewrite. */
export const SONE_HEADER = 'x-endwise-sone';

export function lesAuthSone(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): AuthSone | null {
  if (env.ENDWISE_WHITE_LABEL !== '1' && env.ENDWISE_WHITE_LABEL_SPIKE !== '1') {
    return null;
  }
  const raw = headers.get(SONE_HEADER)?.trim().toLowerCase();
  if (raw === 'platform') return 'platform';
  if (raw === 'forhandler') return 'forhandler';
  return null;
}

export function platformOffentligUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const rot = (env.TENANT_ROOT_DOMAIN ?? 'endwise.no').replace(/^www\./, '');
  return `https://platform.${rot}`;
}

export function platformRpId(env: Record<string, string | undefined> = process.env): string {
  try {
    return new URL(platformOffentligUrl(env)).hostname;
  } catch {
    return 'platform.endwise.no';
  }
}
