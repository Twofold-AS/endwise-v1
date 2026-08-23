/**
 * F1-07 — forhandler limer inn Help/swagger-URL og «Token token=…».
 * Proben og persist skal bruke origin + shop-slug og rå ApiV2-nøkkel.
 */

const DOCS_OR_API_SLUG = /^(api|help|swagger)$/i;

/**
 * Trim, drop query/hash, behold origin + første path-segment (shop-slug).
 * `/api/v2`, `/Help…` og `/swagger…` strippes så docs-URL fortsatt virker.
 */
export function normalizeQuickBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
  const slug = url.pathname.split('/').filter(Boolean)[0];
  if (!slug || DOCS_OR_API_SLUG.test(slug)) return url.origin;
  return `${url.origin}/${slug}`;
}

/**
 * Trim og strip `Token token=` / `token=` slik at Authorization ikke blir
 * `Token token=Token token=…`.
 */
export function normalizeQuickToken(raw: string): string {
  let token = raw
    .trim()
    .replace(/^authorization:\s*/i, '')
    .trim();
  for (let i = 0; i < 5; i++) {
    const next = token
      .replace(/^token\s+token=/i, '')
      .replace(/^token=/i, '')
      .trim();
    if (next === token) break;
    token = next;
  }
  return token;
}
