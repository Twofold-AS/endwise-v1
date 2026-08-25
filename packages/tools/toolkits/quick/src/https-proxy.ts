import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { QuickError } from './errors.ts';

/**
 * Valgfri HTTP CONNECT-proxy for server-side Quick-HTTPS.
 *
 * Av = fjern QUICK_HTTPS_PROXY i Vercel — da går kallet direkte (dagens sti).
 * Satt: undici ProxyAgent, TLS til q3.quick.no forblir ende-til-ende.
 * Brukes KUN av Quick-klienten — aldri setGlobalDispatcher / HTTPS_PROXY
 * (ville proxiet Stripe/Resend også).
 *
 * CWE-532: logg ALDRI denne URL-en (inneholder secret), aldri Authorization.
 */

const INVALID_PROXY = 'Ugyldig QUICK_HTTPS_PROXY';

let cached: { raw: string; agent: ProxyAgent } | null = null;

function dropCachedAgent(): void {
  if (!cached) return;
  const agent = cached.agent;
  cached = null;
  void Promise.resolve(agent.close()).catch(() => undefined);
}

function assertQuickHttpsProxyUri(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new QuickError(INVALID_PROXY);
  }
  const okProto = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  if (!okProto || !parsed.hostname || !parsed.username || !parsed.password) {
    throw new QuickError(INVALID_PROXY);
  }
  return raw;
}

/** undefined når env er uset/tom — da skal fetch gå direkte, uten ProxyAgent. */
export function getQuickHttpsProxyDispatcher(): ProxyAgent | undefined {
  const raw = process.env.QUICK_HTTPS_PROXY?.trim() ?? '';
  if (!raw) {
    dropCachedAgent();
    return undefined;
  }
  if (cached?.raw === raw) return cached.agent;
  dropCachedAgent();
  const agent = new ProxyAgent(assertQuickHttpsProxyUri(raw));
  cached = { raw, agent };
  return agent;
}

/** Alle Quick-HTTPS-kall skal gå her, ikke via rå `fetch`. */
export function quickFetch(input: string, init?: RequestInit): Promise<Response> {
  const dispatcher = getQuickHttpsProxyDispatcher();
  if (!dispatcher) {
    return fetch(input, init);
  }
  return undiciFetch(input, {
    method: init?.method,
    headers: init?.headers as Record<string, string> | undefined,
    redirect: init?.redirect,
    signal: init?.signal ?? undefined,
    dispatcher,
  }) as unknown as Promise<Response>;
}
