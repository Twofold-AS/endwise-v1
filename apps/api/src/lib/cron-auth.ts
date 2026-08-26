import { timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

/**
 * F8-01 / CWE-306 — Delt fail-closed-guard for eksternt trigg­bare cron-ruter.
 * Cron-endepunkter kjører uten brukersesjon og gjør privilegerte ting (sletting,
 * utgående synk mot alle tenants). De MÅ feile lukket: mangler `CRON_SECRET`, er
 * endepunktet stengt — ikke åpent. Tidligere hadde flere ruter mønsteret
 * `if (secret && header !== …)` som slapp alt gjennom når secreten var uset.
 * Én implementasjon, brukt av alle cron-ruter, så mønsteret ikke kan drifte fra
 * hverandre igjen. Ingen query-param kan forbigå denne (den kjører som middleware
 * Før handleren).
 */
export type CronAuthResult = 'ok' | 'missing-secret' | 'unauthorized';

/**
 * Ren, testbar avgjørelse. Konstant-tids sammenligning av Bearer-token (unngår
 * timing-orakel). Lengdesjekk først er OK — den lekker bare lengden på en verdi
 * angriperen uansett kontrollerer (sitt eget forsøk), ikke på secreten.
 */
export function evaluateCronAuth(
  authHeader: string | undefined,
  secret: string | undefined,
): CronAuthResult {
  if (!secret) return 'missing-secret';
  const expected = `Bearer ${secret}`;
  const got = authHeader ?? '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return 'unauthorized';
  return timingSafeEqual(a, b) ? 'ok' : 'unauthorized';
}

/**
 * Hono-middleware. Legg på hver cron-rute: `new Hono.use('*', cronAuth).get(…)`.
 * 503 hvis secret mangler (feil lukket), 401 ved feil/manglende Bearer.
 */
export const cronAuth: MiddlewareHandler = async (c, next) => {
  const result = evaluateCronAuth(c.req.header('authorization'), process.env.CRON_SECRET);
  if (result === 'missing-secret') {
    return c.json({ error: 'CRON_SECRET ikke konfigurert' }, 503);
  }
  if (result === 'unauthorized') {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
};
