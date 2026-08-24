import { QuickAuthError, QuickError } from './errors.ts';
import { normalizeQuickBaseUrl, normalizeQuickToken } from './normalize.ts';
import { QUICK_PROBE_USER_MESSAGES } from './probe-error.ts';
import { quickClientInfo } from './schema.ts';
import { assertAllowedQuickUrl } from './url-guard.ts';

/**
 * F1-07 — GET-only tilkoblingsprobe mot Quick.
 *
 * Bekreftet endepunkt: `GET /api/v2/client/info` (se schema.ts).
 * Ingen POST/PUT/PATCH/DELETE. Ingen pull/push. Ingen synk.
 *
 * Tokenet sendes som `Authorization` og logges ALDRI her.
 *
 * Live onboarding-probe (`setConfig` / `onboarding.fullfor`) kjører i
 * NETTLESEREN (forhandlerens IP). Verifisert 24.08.2026 mot q3.quick.no:
 *   Access-Control-Allow-Origin: *
 *   Access-Control-Allow-Methods: GET,PUT,POST,DELETE,OPTIONS
 *   Access-Control-Allow-Headers: Content-Type, Authorization
 * Nettleseren kan derfor GET-e direkte. User-Agent er et forbidden header
 * i fetch og står ikke i CORS allow-headers — utelates i nettleseren
 * (nettleserens egen UA går med). Server-residual (testConnection, pull)
 * sender fortsatt `Endwise/1 QuickProbe`.
 *
 * apps/api er portet inn i Next på Vercel fra1 — det finnes ingen Scaleway-
 * hop for denne GET-en. Same-origin rewrite ville fortsatt gått ut fra fra1.
 */

export const QUICK_READ_ONLY_PROBE_METHOD = 'GET';
/** Relativt til instansens baseUrl (uten trailing slash). */
export const QUICK_READ_ONLY_PROBE_PATH = '/api/v2/client/info';
/** Stabil UA — kun server-residual. Nettleser-fetch kan ikke sette UA. */
export const QUICK_PROBE_USER_AGENT = 'Endwise/1 QuickProbe';

const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_RESPONSE_BYTES = 256_000;

async function lesSvarCapped(response: Response, max: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > max) {
    throw new QuickError('Quick-svar for stort');
  }
  if (!response.body) {
    throw new QuickError('Uventet svar fra Quick (ikke JSON)');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new QuickError('Quick-svar for stort');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export type QuickProbeConfig = {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  /**
   * Server-residual setter UA. Nettleser-proben MÅ være false: User-Agent er
   * forbidden i fetch, og Quick CORS tillater bare Content-Type + Authorization.
   */
  includeUserAgent?: boolean;
};

export function quickProbeTargetUrl(baseUrl: string): string {
  const normalized = normalizeQuickBaseUrl(baseUrl);
  if (!normalized) throw new QuickError(QUICK_PROBE_USER_MESSAGES.noUrl);
  const validated = assertAllowedQuickUrl(normalized);
  const base = `${validated.origin}${validated.pathname}`
    .replace(/\/+$/, '')
    .replace(/\/api\/v2$/i, '');
  return `${base}${QUICK_READ_ONLY_PROBE_PATH}`;
}

export function quickProbeHeaders(
  token: string,
  opts?: { includeUserAgent?: boolean },
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Token token=${token}`,
    Accept: 'application/json',
  };
  if (opts?.includeUserAgent !== false) {
    headers['User-Agent'] = QUICK_PROBE_USER_AGENT;
  }
  return headers;
}

/**
 * Ett lesekall. Kaster ved 401/403, nettverksfeil, SSRF-ulovlig URL
 * eller uventet svar. Returnerer void — innholdet brukes ikke til synk.
 *
 * Default inkluderer User-Agent (server-residual). Sett
 * `includeUserAgent: false` fra nettleseren.
 */
export async function probeQuickReadOnly(config: QuickProbeConfig): Promise<void> {
  const baseUrl = normalizeQuickBaseUrl(config.baseUrl);
  const token = normalizeQuickToken(config.token);
  if (!baseUrl) throw new QuickError(QUICK_PROBE_USER_MESSAGES.noUrl);
  if (!token) throw new QuickError(QUICK_PROBE_USER_MESSAGES.noToken);

  const url = quickProbeTargetUrl(baseUrl);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const includeUserAgent = config.includeUserAgent !== false;

  let response: Response;
  try {
    response = await fetch(url, {
      method: QUICK_READ_ONLY_PROBE_METHOD,
      headers: quickProbeHeaders(token, { includeUserAgent }),
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const timedOut = (cause as Error)?.name === 'TimeoutError';
    throw new QuickError(timedOut ? 'Tidsavbrudd mot Quick' : 'Nådde ikke Quick');
  }

  if (response.status === 401 || response.status === 403) {
    throw new QuickAuthError('Quick avviste token (401/403)', response.status);
  }
  if (!response.ok) {
    throw new QuickError(`Quick svarte ${response.status}`, response.status);
  }

  let json: unknown;
  try {
    json = JSON.parse(await lesSvarCapped(response, MAX_RESPONSE_BYTES));
  } catch (error) {
    if (error instanceof QuickError) throw error;
    throw new QuickError('Uventet svar fra Quick (ikke JSON)');
  }
  try {
    quickClientInfo.parse(json);
  } catch {
    throw new QuickError('Uventet svarformat fra Quick');
  }
}
