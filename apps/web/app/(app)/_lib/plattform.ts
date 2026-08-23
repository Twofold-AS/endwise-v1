/**
 * Klient-speil av `@endwise/modules/plattform`. Web importerer ikke
 * `@endwise/modules` (server-laget). Hold i synk med pakken.
 */

export const LESING_TITLE = 'Kun lesing';

export function remapHrefTilInspect(href: string, slug: string): string {
  const [path, query] = href.split('?');
  const mapped = `/endwise/verksted/${slug}${path === '/' ? '' : path}`;
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

/** UI: kind=platform ELLER slug=endwise — ikke vent på at setup har satt kind. */
export function erPlattformIUi(input: {
  erPlattform?: boolean;
  slug?: string | null;
  kind?: string | null;
}): boolean {
  return Boolean(input.erPlattform) || input.kind === 'platform' || input.slug === 'endwise';
}

export function erForhandlerRutePaaPlattform(pathname: string): boolean {
  if (pathname.startsWith('/endwise')) return false;
  if (pathname.startsWith('/innstillinger/profil')) return false;
  if (pathname.startsWith('/2fa')) return false;
  if (pathname.startsWith('/oppstart')) return false;
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/innboks') ||
    pathname.startsWith('/saker') ||
    pathname.startsWith('/kunder') ||
    pathname.startsWith('/kjoretoy') ||
    pathname.startsWith('/samarbeid') ||
    pathname.startsWith('/analyse') ||
    pathname.startsWith('/ai-') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/lager') ||
    pathname.startsWith('/min-dag') ||
    pathname.startsWith('/mekaniker') ||
    pathname.startsWith('/butikk') ||
    pathname.startsWith('/bookinger') ||
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/innstillinger') ||
    pathname.startsWith('/integrasjoner') ||
    pathname.startsWith('/mekanikere')
  );
}
