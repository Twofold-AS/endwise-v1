/**
 * Forhandler limer inn Help/swagger-URL og «Token token=…».
 * Proben og persist skal bruke origin + shop-slug og rå ApiV2-nøkkel.
 */

const DOCS_OR_API_SLUG = /^(api|help|swagger)$/i;
const API_V2_SUFFIX = '/api/v2';

/** Lineær strip av trailing `/`. Unngår `/\/+$/` mot limt URL. */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return end === value.length ? value : value.slice(0, end);
}

/** Case-insensitive `/api/v2` på slutten. */
export function stripTrailingApiV2(value: string): string {
  if (
    value.length >= API_V2_SUFFIX.length &&
    value.slice(-API_V2_SUFFIX.length).toLowerCase() === API_V2_SUFFIX
  ) {
    return value.slice(0, -API_V2_SUFFIX.length);
  }
  return value;
}

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
    return stripTrailingSlashes(trimmed);
  }
  const slug = url.pathname.split('/').filter(Boolean)[0];
  if (!slug || DOCS_OR_API_SLUG.test(slug)) return url.origin;
  return `${url.origin}/${slug}`;
}

/** Maks lengde på ApiV2-nøkkel etter normalisering. Over = avvis (tom). */
export const MAX_QUICK_TOKEN_LENGTH = 512;

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
  if (token.length > MAX_QUICK_TOKEN_LENGTH) return '';
  return token;
}
