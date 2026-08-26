import { Agent, type Dispatcher, ProxyAgent, fetch as undiciFetch } from 'undici';
import { QuickError } from './errors.ts';
import {
  GATEWAY_SECRET_HEADER,
  getQuickGatewayBaseUrl,
  getQuickGatewaySecret,
  rewriteQuickUrlForGateway,
} from './gateway.ts';

/**
 * Valgfri egress for server-side Quick-HTTPS.
 * 1. QUICK_GATEWAY_URL satt → tynn live-gateway (HTTPS på boksen → q3.quick.no).
 * Connect (QUICK_HTTPS_PROXY) ignoreres så den kan stå av.
 * 2. Ellers QUICK_HTTPS_PROXY satt → undici ProxyAgent (HTTP connect).
 * TLS til q3.quick.no er ende-til-ende.
 * 3. Begge uset/tom → direkte fetch (dagens sti).
 * Alle stier sender curl-ekvivalent form mot Quick (eller mot gatewayen, som
 * selv gjør curl-ekvivalent mot q3.quick.no): User-Agent curl/8.5.0 + HTTP/1.1
 * (undici Agent allowH2: false). Live curl på Scaleway-boksen ga 200; Node
 * default ua / H2 ga 500 på samme GET.
 * Brukes kun av Quick-klienten — aldri setGlobalDispatcher / HTTPS_PROXY
 * (ville proxiet Stripe/Resend også).
 * CWE-532: logg aldri gateway-/proxy-URL, secret eller Authorization.
 */

const INVALID_PROXY = 'Ugyldig QUICK_HTTPS_PROXY';

/** Samme ua som working `curl` mot q3.quick.no. */
export const QUICK_CURL_USER_AGENT = 'curl/8.5.0';
export const QUICK_UPSTREAM_ALLOW_H2 = false;

const http11Dispatcher = new Agent({ allowH2: QUICK_UPSTREAM_ALLOW_H2 });

export function getQuickHttp11Dispatcher(): Agent {
  return http11Dispatcher;
}

type QuickFetchInit = RequestInit & { dispatcher?: Dispatcher };

function curlEquivalentHeaders(init?: RequestInit): Record<string, string> {
  const incoming = (init?.headers as Record<string, string> | undefined) ?? {};
  return {
    ...incoming,
    'User-Agent': QUICK_CURL_USER_AGENT,
  };
}

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
  const agent = new ProxyAgent({
    uri: assertQuickHttpsProxyUri(raw),
    allowH2: QUICK_UPSTREAM_ALLOW_H2,
  });
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
      ...curlEquivalentHeaders(init),
      [GATEWAY_SECRET_HEADER]: secret,
    };
    const gatewayInit: QuickFetchInit = {
      ...init,
      headers,
      dispatcher: http11Dispatcher,
    };
    return fetch(url, gatewayInit as RequestInit);
  }

  const headers = curlEquivalentHeaders(init);
  const dispatcher = getQuickHttpsProxyDispatcher();
  if (!dispatcher) {
    const directInit: QuickFetchInit = {
      ...init,
      headers,
      dispatcher: http11Dispatcher,
    };
    return fetch(input, directInit as RequestInit);
  }
  return undiciFetch(input, {
    method: init?.method,
    headers,
    redirect: init?.redirect,
    signal: init?.signal ?? undefined,
    dispatcher,
  }) as unknown as Promise<Response>;
}
