/**
 * Klient-speil av `@endwise/modules/plattform`. Web importerer ikke
 * `@endwise/modules` (server-laget). Hold i synk med pakken.
 */

export const LESING_TITLE = 'Kun lesing';

/** Nav-alias → eksisterende inspect-side (ingen /jobber under verksted/). */
const INSPECT_KANONISK: Record<string, string> = {
  '/jobber': '/saker',
  '/rapporter': '/analyse',
  '/hjelp': '/support',
  '/verkstedet': '/dashboard',
  '/prisliste': '/innstillinger/tjenestekatalog',
  '/forhandleren': '/organisasjon',
  '/organisasjon': '/organisasjon/forhandleren',
};

export function remapHrefTilInspect(href: string, slug: string): string {
  const [path, query] = href.split('?');
  const kanon = INSPECT_KANONISK[path ?? ''] ?? path;
  const mapped = `/endwise/verksted/${slug}${kanon === '/' ? '' : kanon}`;
  return query ? `${mapped}?${query}` : mapped;
}

export function isVerkstedInspectPath(pathname: string): boolean {
  return pathname.startsWith('/endwise/verksted/');
}

export function verkstedSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/endwise\/verksted\/([^/]+)/);
  return m?.[1] ?? null;
}

export function tilbakeHref(fra: string | null | undefined): string {
  if (fra === 'forhandlere') return '/endwise/forhandlere';
  return '/endwise/innboks';
}

export function plattformToast(): string {
  return 'Endwise er plattformen, ikke et verksted.';
}

/** UI: kind=platform eller slug=endwise — ikke vent på at setup har satt kind. */
export function erPlattformIUi(input: {
  erPlattform?: boolean;
  slug?: string | null;
  kind?: string | null;
}): boolean {
  return Boolean(input.erPlattform) || input.kind === 'platform' || input.slug === 'endwise';
}

export function erForhandlerRutePaaPlattform(pathname: string, search = ''): boolean {
  if (pathname.startsWith('/endwise')) return false;
  // Settings-flaten (`/innstillinger` + profil-aliaset) er egen bruker, ikke
  // forhandler-konfig — unntatt dealer-fakturering (Abonnement / Tjenester &
  // priser). Gamle URL-er dit skal vekk, ikke lande som verksted-betaling.
  const fane = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('fane');
  if (
    (pathname === '/innstillinger' || pathname.startsWith('/innstillinger/profil')) &&
    (fane === 'abonnement' || fane === 'tjenester')
  ) {
    return true;
  }
  if (pathname === '/innstillinger') return false;
  if (pathname.startsWith('/innstillinger/profil')) return false;
  if (pathname.startsWith('/2fa')) return false;
  if (pathname.startsWith('/oppstart')) return false;
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/innboks') ||
    pathname.startsWith('/saker') ||
    pathname.startsWith('/jobber') ||
    pathname.startsWith('/kunder') ||
    pathname.startsWith('/kjoretoy') ||
    pathname.startsWith('/samarbeid') ||
    pathname.startsWith('/analyse') ||
    pathname.startsWith('/rapporter') ||
    pathname.startsWith('/ai-') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/hjelp') ||
    pathname.startsWith('/verkstedet') ||
    pathname.startsWith('/prisliste') ||
    pathname.startsWith('/lager') ||
    pathname.startsWith('/min-dag') ||
    pathname.startsWith('/mekaniker') ||
    pathname.startsWith('/butikk') ||
    pathname.startsWith('/bookinger') ||
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/tjenester') ||
    pathname.startsWith('/innstillinger') ||
    pathname.startsWith('/integrasjoner') ||
    pathname.startsWith('/mekanikere') ||
    pathname.startsWith('/organisasjon') ||
    pathname.startsWith('/forhandleren')
  );
}
