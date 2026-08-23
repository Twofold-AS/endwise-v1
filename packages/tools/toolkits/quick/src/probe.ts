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
 */

export const QUICK_READ_ONLY_PROBE_METHOD = 'GET';
/** Relativt til instansens baseUrl (uten trailing slash). */
export const QUICK_READ_ONLY_PROBE_PATH = '/api/v2/client/info';
/** Stabil UA — Quick kan 500-e Vercel-egress uten kjent klient. */
export const QUICK_PROBE_USER_AGENT = 'Endwise/1 QuickProbe';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 25_000_000;

export type QuickProbeConfig = {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
};

/**
 * Ett lesekall. Kaster ved 401/403, nettverksfeil, SSRF-ulovlig URL
 * eller uventet svar. Returnerer void — innholdet brukes ikke til synk.
 */
export async function probeQuickReadOnly(config: QuickProbeConfig): Promise<void> {
  const baseUrl = normalizeQuickBaseUrl(config.baseUrl);
  const token = normalizeQuickToken(config.token);
  if (!baseUrl) throw new QuickError(QUICK_PROBE_USER_MESSAGES.noUrl);
  if (!token) throw new QuickError(QUICK_PROBE_USER_MESSAGES.noToken);

  const validated = assertAllowedQuickUrl(baseUrl);
  // Aldri .../api/v2/api/v2/client/info — en limt /api/v2-suffix 500-er hos Quick.
  const base = `${validated.origin}${validated.pathname}`
    .replace(/\/+$/, '')
    .replace(/\/api\/v2$/i, '');
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(`${base}${QUICK_READ_ONLY_PROBE_PATH}`, {
      method: QUICK_READ_ONLY_PROBE_METHOD,
      headers: {
        Authorization: `Token token=${token}`,
        Accept: 'application/json',
        'User-Agent': QUICK_PROBE_USER_AGENT,
      },
      redirect: 'error',
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

  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new QuickError('Quick-svar for stort');
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new QuickError('Uventet svar fra Quick (ikke JSON)');
  }
  try {
    quickClientInfo.parse(json);
  } catch {
    throw new QuickError('Uventet svarformat fra Quick');
  }
}
