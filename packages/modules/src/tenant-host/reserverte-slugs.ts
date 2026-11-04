/**
 * F16 / white label F0 — reserverte subdomener.
 * `app` er bedriftsinnlogging (F39, Mikael 04.11.2026) — ikke forhandler-slug.
 * Kodefallback. Tabellen `reserverte_slugs` kan utvides av admin.
 * Alt som er `endwise` eller starter med `endwise-` er også reservert.
 */
export const RESERVERTE_SLUGS = [
  'platform',
  'admin',
  'www',
  'app',
  'api',
  'mail',
  'smtp',
  'imap',
  'ftp',
  'status',
  'docs',
  'help',
  'hjelp',
  'support',
  'kunde',
  'login',
  'logg-inn',
  'auth',
  'static',
  'assets',
  'cdn',
  'dev',
  'test',
  'staging',
  'preview',
  'demo',
  'widget',
  'cron',
  'stream',
  'framer',
  'noreply',
  'no-reply',
  'post',
  'webmail',
] as const;

const RESERVERT_SETT = new Set<string>(RESERVERTE_SLUGS);

export function erReservertSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (!s) return false;
  if (s === 'endwise' || s.startsWith('endwise-')) return true;
  return RESERVERT_SETT.has(s);
}
