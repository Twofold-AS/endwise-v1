import {
  createWidgetKeyService,
  normalizeOrigin,
  originAllowed,
  verifyWidgetToken,
  WidgetTokenError,
} from '@endwise/modules/widget';
import type { MiddlewareHandler } from 'hono';
import { createAppContext } from '../context.ts';

/**
 * Auth/CORS-lag for de offentlige `/widget/*`-endepunktene.
 * Trusselmodell: uautentisert, cross-origin, anonyme kunder. Sikkerheten hviler
 * på (1) origin-validering + publishable key ved `/init` (utsteder token), og
 * (2) et kortlevd token verifisert på hver etterfølgende forespørsel her.
 */

export interface WidgetVars {
  /** Tenant fra det verifiserte tokenet. Aldri fra klient-input. */
  widgetTenantId: string;
  /** Anonym kunde-ID for økten. */
  widgetCid: string;
}

/**
 * Hemmelighet for å signere widget-tokens. Egen `WIDGET_TOKEN_SECRET` foretrekkes;
 * faller tilbake til `BETTER_AUTH_SECRET` (finnes alltid i et kjørende miljø).
 * Feiler lukket: kaster hvis ingen finnes (ingen token kan da utstedes/verifiseres).
 */
export function widgetTokenSecret(): string {
  const s = process.env.WIDGET_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s) throw new WidgetTokenError('Mangler WIDGET_TOKEN_SECRET/BETTER_AUTH_SECRET');
  return s;
}

export interface WidgetCorsValg {
  /** Returner nøkkelens allowedOrigins. Null nøkkel = ikke funnet. */
  hentTillatteOrigins?: (nokkel: string) => Promise<readonly string[] | null>;
  erProduksjon?: boolean;
}

async function defaultHentOrigins(nokkel: string): Promise<readonly string[] | null> {
  try {
    const r = await createWidgetKeyService(createAppContext().db).resolveByPublishableKey(nokkel);
    return r?.allowedOrigins ?? [];
  } catch {
    return [];
  }
}

async function publishableKeyFraRequest(c: {
  req: {
    header: (n: string) => string | undefined;
    method: string;
    raw: Request;
  };
}): Promise<string | null> {
  const header = c.req.header('x-widget-key');
  if (header?.startsWith('pk_')) return header;
  if (c.req.method !== 'POST') return null;
  const ct = c.req.header('content-type') ?? '';
  if (!ct.includes('application/json')) return null;
  try {
    const body = (await c.req.raw.clone().json()) as { publishableKey?: unknown };
    if (typeof body.publishableKey === 'string' && body.publishableKey.startsWith('pk_')) {
      return body.publishableKey;
    }
  } catch {
    return null;
  }
  return null;
}

function avvisHttpIProd(origin: string, erProduksjon: boolean): boolean {
  return erProduksjon && origin.startsWith('http:');
}

/**
 * CORS for `/widget/*`. Speiler kun origins i nøkkelens `allowedOrigins`.
 * Alltid `Vary: Origin`. Aldri `*`. `http:` avvises i produksjon.
 * Preflight (OPTIONS) uten nøkkelverdi speiler kun gyldig `https:` — nettleseren
 * sender ikke `X-Widget-Key`-verdien på preflight. Ekte respons slår opp nøkkelen.
 */
export function createWidgetCors(valg: WidgetCorsValg = {}): MiddlewareHandler {
  const erProduksjon = valg.erProduksjon ?? process.env.NODE_ENV === 'production';
  const hent = valg.hentTillatteOrigins ?? defaultHentOrigins;

  return async (c, next) => {
    c.header('Vary', 'Origin');
    const origin = normalizeOrigin(c.req.header('origin'));
    if (origin && !avvisHttpIProd(origin, erProduksjon)) {
      const nokkel = await publishableKeyFraRequest(c);
      if (nokkel) {
        const allowed = (await hent(nokkel)) ?? [];
        if (originAllowed(origin, allowed)) {
          c.header('Access-Control-Allow-Origin', origin);
        }
      } else if (c.req.method === 'OPTIONS') {
        // Preflight har ikke nøkkelverdi. https alltid; http kun utenfor prod.
        c.header('Access-Control-Allow-Origin', origin);
      }
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Widget-Key');
    c.header('Access-Control-Max-Age', '600');
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    await next();
  };
}

export const widgetCors: MiddlewareHandler = createWidgetCors();

/**
 * Verifiserer widget-tokenet (Authorization: Bearer <token>). Feiler lukket (401).
 * Setter `widgetTenantId` + `widgetCid` på context — alt nedstrøms scoper til dem.
 */
export const widgetAuth: MiddlewareHandler<{ Variables: WidgetVars }> = async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Mangler token' }, 401);
  try {
    const payload = verifyWidgetToken(token, widgetTokenSecret());
    c.set('widgetTenantId', payload.tid);
    c.set('widgetCid', payload.cid);
  } catch {
    return c.json({ error: 'Ugyldig eller utløpt token' }, 401);
  }
  await next();
};

/** Klient-IP fra proxy-headere (Vercel/edge). Til rate-limit-nøkler. */
export function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return c.req.header('x-real-ip') || 'unknown';
}
