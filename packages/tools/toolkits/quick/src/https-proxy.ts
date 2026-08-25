import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { QuickError } from './errors.ts';
import {
  GATEWAY_SECRET_HEADER,
  getQuickGatewayBaseUrl,
  getQuickGatewaySecret,
  rewriteQuickUrlForGateway,
} from './gateway.ts';

/**
 * Valgfri egress for server-side Quick-HTTPS.
 *
 * 1. QUICK_GATEWAY_URL satt → tynn live-gateway (HTTPS på boksen → q3.quick.no).
 *    CONNECT (QUICK_HTTPS_PROXY) ignoreres så den kan stå av.
 * 2. Ellers QUICK_HTTPS_PROXY satt → undici ProxyAgent (HTTP CONNECT).
 *    TLS til q3.quick.no er ende-til-ende.
 * 3. Begge uset/tom → direkte fetch (dagens sti).
 *
 * Brukes KUN av Quick-klienten — aldri setGlobalDispatcher / HTTPS_PROXY
 * (ville proxiet Stripe/Resend også).
 *
 * CWE-532: logg ALDRI gateway-/proxy-URL, secret eller Authorization.
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
  const gateway = getQuickGatewayBaseUrl();
  if (gateway) {
    const secret = getQuickGatewaySecret();
    const url = rewriteQuickUrlForGateway(input, gateway);
    const headers = {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      [GATEWAY_SECRET_HEADER]: secret,
    };
    return fetch(url, { ...init, headers });
  }

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
