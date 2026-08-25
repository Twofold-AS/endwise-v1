import { QuickError } from './errors.ts';

/**
 * Valgfri tynn live-gateway for server-side Quick-HTTPS.
 *
 * Av = fjern QUICK_GATEWAY_URL i Vercel — da går kallet direkte (eller via
 * valgfri CONNECT hvis QUICK_HTTPS_PROXY er satt).
 * Satt: kall skrives om til gateway-origin + samme sti; forhandler-token
 * sendes per request. CONNECT brukes ikke når gateway er på.
 *
 * CWE-532: logg ALDRI denne URL-en eller secret.
 */

export const GATEWAY_SECRET_HEADER = 'X-Endwise-Gateway-Secret';

const INVALID_GATEWAY = 'Ugyldig QUICK_GATEWAY_URL';
const MISSING_SECRET = 'Mangler QUICK_GATEWAY_SECRET';

/** undefined når env er uset/tom — da skal fetch gå uten gateway. */
export function getQuickGatewayBaseUrl(): string | undefined {
  const raw = process.env.QUICK_GATEWAY_URL?.trim() ?? '';
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new QuickError(INVALID_GATEWAY);
  }
  const okProto = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  if (!okProto || !parsed.hostname || parsed.username || parsed.password) {
    throw new QuickError(INVALID_GATEWAY);
  }
  return parsed.origin;
}

export function getQuickGatewaySecret(): string {
  const secret = process.env.QUICK_GATEWAY_SECRET?.trim() ?? '';
  if (!secret) throw new QuickError(MISSING_SECRET);
  return secret;
}

/** Beholder Quick-sti og query; bytter kun origin til gateway. */
export function rewriteQuickUrlForGateway(quickUrl: string, gatewayOrigin: string): string {
  const src = new URL(quickUrl);
  return `${gatewayOrigin}${src.pathname}${src.search}`;
}
