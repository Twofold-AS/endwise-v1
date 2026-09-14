/**
 * F4 — Widget API-klient (framework-agnostisk, ren fetch).
 * Veksler publishable key inn i et kortlevd token via `/widget/init`, og bærer
 * tokenet på alle etterfølgende kall. Ingen hemmeligheter her — kun den offentlige
 * publishable key-en (trygg i en publisert side). Tenant velges av nøkkelen
 * server-side — klienten sender aldri tenantId.
 */

import {
  sanitizeWidgetFunnelEvent,
  type WidgetFunnelEventName,
  type WidgetFunnelProps,
} from '@endwise/events';

export interface WidgetClientOptions {
  /** Base-URL til Endwise-API-et. Prod: `https://endwise.no` (`/widget/*` på web). */
  apiBase: string;
  /** Publishable key (pk_live_…). Offentlig. */
  publishableKey: string;
}

export interface WidgetCapabilities {
  shop: boolean;
}

export interface WidgetInitResult {
  token: string;
  expiresIn: number;
  cid: string;
  capabilities: WidgetCapabilities;
}

export interface WidgetShopItem {
  id: string;
  sku: string;
  name: string;
  priceMinor: number;
  available: boolean;
}

export interface WidgetService {
  serviceVersionId: string;
  name: string;
  vehicleType: string;
  durationMinutes: number;
  priceMinor: number | null;
}

export interface ChatReply {
  /** [ART50-UI] Alltid til stede — art. 50-opplysningen fra serveren. */
  disclosure: string;
  reply: string;
  escalated: boolean;
}

export class WidgetClientError extends Error {}

export function createWidgetClient(opts: WidgetClientOptions) {
  let token: string | null = null;
  let capabilities: WidgetCapabilities = { shop: false };

  async function init(): Promise<WidgetInitResult> {
    const res = await fetch(`${opts.apiBase}/widget/init`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publishableKey: opts.publishableKey }),
    });
    if (!res.ok) throw new WidgetClientError('Kunne ikke starte widget (init)');
    const data = (await res.json()) as Partial<WidgetInitResult> & { token?: string };
    if (!data.token) throw new WidgetClientError('Kunne ikke starte widget (init)');
    token = data.token;
    capabilities = { shop: data.capabilities?.shop === true };
    return {
      token: data.token,
      expiresIn: typeof data.expiresIn === 'number' ? data.expiresIn : 900,
      cid: typeof data.cid === 'string' ? data.cid : '',
      capabilities,
    };
  }

  async function authed<T>(path: string, init2?: RequestInit): Promise<T> {
    if (!token) await ensureToken();
    const res = await fetch(`${opts.apiBase}${path}`, {
      ...init2,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init2?.headers ?? {}),
      },
    });
    if (res.status === 401) {
      // Token utløpt → forny én gang.
      token = null;
      await ensureToken();
      return authed<T>(path, init2);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new WidgetClientError(body.error ?? 'Kunne ikke hente data. Prøv igjen.');
    }
    return (await res.json()) as T;
  }

  let initPromise: Promise<WidgetInitResult> | null = null;
  function ensureToken(): Promise<void> {
    initPromise ??= init().finally(() => {
      initPromise = null;
    });
    return initPromise.then(() => undefined);
  }

  return {
    ensureToken,
    listServices: () => authed<{ services: WidgetService[] }>('/widget/services'),
    availability: (serviceVersionId: string, date: string) =>
      authed<{ slots: string[] }>(
        `/widget/availability?serviceVersionId=${encodeURIComponent(serviceVersionId)}&date=${date}`,
      ),
    createBooking: (input: {
      serviceVersionId: string;
      startsAt: string;
      customer: { name: string; phone: string; email?: string };
      regNumber?: string;
      notes?: string;
    }) =>
      authed<{ bookingId: string; status: string }>('/widget/booking', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    chat: (message: string, locale: 'no' | 'en' = 'no') =>
      authed<ChatReply>('/widget/chat', {
        method: 'POST',
        body: JSON.stringify({ message, locale }),
      }),
    capabilities: () => capabilities,
    track: (name: WidgetFunnelEventName, props: WidgetFunnelProps = {}) => {
      const event = sanitizeWidgetFunnelEvent({ name, props });
      if (!event) return Promise.resolve();
      return authed<{ ok: boolean }>('/widget/events', {
        method: 'POST',
        body: JSON.stringify(event),
      }).then(() => undefined);
    },
    shopCatalog: () => authed<{ items: WidgetShopItem[] }>('/widget/shop/catalog'),
  };
}

export type WidgetClient = ReturnType<typeof createWidgetClient>;

/**
 * [ART50-UI] Statisk fallback-tekst vist før første serversvar. Speiler
 * `WIDGET_AI_DISCLOSURE` i `@endwise/modules/widget` og `AI_DISCLOSURE_TEXT` i
 * `@endwise/ui`. Lovtekst (AI Act art. 50) — ikke fjern, ikke flytt fra samtalestart.
 */
export const WIDGET_DISCLOSURE_TEXT: Record<'no' | 'en', string> = {
  no: 'Du snakker nå med en AI-assistent, ikke et menneske. Du kan når som helst be om å bli satt over til en medarbeider.',
  en: 'You are chatting with an AI assistant, not a human. You can ask to be transferred to a person at any time.',
};
