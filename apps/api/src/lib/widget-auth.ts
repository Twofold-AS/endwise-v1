import { verifyWidgetToken, WidgetTokenError } from '@endwise/modules/widget';
import type { MiddlewareHandler } from 'hono';

/**
 * F4-02 — Auth/CORS-lag for de OFFENTLIGE `/widget/*`-endepunktene.
 *
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

/**
 * CORS for `/widget/*`. Ekko-er request-origin (embed-en er cross-origin) og
 * svarer på preflight. Ingen credentials (token ligger i Authorization-headeren,
 * ikke i en cookie) — så vi trenger ikke `Allow-Credentials`, og den ekte
 * tenant-grensen håndheves av origin-sjekk ved `/init` + token, ikke av CORS.
 */
export const widgetCors: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('origin');
  if (origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Widget-Key');
  c.header('Access-Control-Max-Age', '600');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
};

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
