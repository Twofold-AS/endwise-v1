/**
 * Endwise som plattform-org — ikke et verksted.
 * Jobbfunksjonene leder|selger|support|mekaniker (F1-10) brukes aldri her.
 * Plattform-«support» er et tilgangsnivå, ikke en forhandler-funksjon.
 */

import { erEndwiseSlug } from '../billing/plans.ts';

export const TENANT_KIND_PLATFORM = 'platform' as const;

export const PLATFORM_NIVA = ['eier', 'administrator', 'support'] as const;
export type PlatformNiva = (typeof PLATFORM_NIVA)[number];

/** Nivåer som kan inviteres. Eier opprettes én gang (første endwise_admin). */
export const INVITERBARE_PLATFORM_NIVA = ['administrator', 'support'] as const;
export type InviterbartPlatformNiva = (typeof INVITERBARE_PLATFORM_NIVA)[number];

export const PLATFORM_ROLLER = ['endwise_admin', 'endwise_support'] as const;
export type PlatformRolle = (typeof PLATFORM_ROLLER)[number];

/** Plattform-tenant: kind=platform eller slug endwise. Aldri en forhandler. */
export function erPlattformTenant(input: { slug?: string | null; kind?: string | null }): boolean {
  return input.kind === TENANT_KIND_PLATFORM || erEndwiseSlug(input.slug);
}

export function erPlatformRolle(rolle: string | null | undefined): boolean {
  return rolle === 'endwise_admin' || rolle === 'endwise_support';
}

/**
 * Utled plattformnivå fra Better-Auth-rollen + eier-flagg.
 * Eier er den første `endwise_admin` (Mikael) — aldri inviterbar.
 */
export function resolvePlatformNiva(input: {
  rolle: string | null | undefined;
  erEier?: boolean;
}): PlatformNiva | null {
  if (input.rolle === 'endwise_support') return 'support';
  if (input.rolle === 'endwise_admin') return input.erEier ? 'eier' : 'administrator';
  return null;
}

export function rolleForPlatformNiva(niva: InviterbartPlatformNiva): PlatformRolle {
  return niva === 'support' ? 'endwise_support' : 'endwise_admin';
}

export function kanSePlatformTeam(niva: PlatformNiva | null): boolean {
  return niva === 'eier' || niva === 'administrator';
}

export function kanStyrePlatform(niva: PlatformNiva | null): boolean {
  return niva === 'eier' || niva === 'administrator';
}

/** Support: innboks + Se verkstedet. Ingen flagg, slett eller team. */
export function kanSeVerkstedet(niva: PlatformNiva | null): boolean {
  return niva === 'eier' || niva === 'administrator' || niva === 'support';
}

export function kanFjerneEllerEndreNiva(mal: {
  erEier: boolean;
  userId: string;
  kallendeUserId: string;
}): boolean {
  if (mal.erEier) return false;
  if (mal.userId === mal.kallendeUserId) return false;
  return true;
}

export function landingForPlatform(rolle: string | null | undefined): string | null {
  if (!erPlatformRolle(rolle)) return null;
  return '/endwise';
}

export function plattformToast(): string {
  return 'Endwise er plattformen, ikke et verksted.';
}

export function invitasjonstekst(niva: InviterbartPlatformNiva): {
  subject: string;
  ingress: string;
  side: string;
} {
  if (niva === 'administrator') {
    return {
      subject: 'Du er invitert til Endwise-support som administrator',
      ingress: 'Du er invitert til Endwise-support som administrator.',
      side: 'Du er invitert til Endwise-support som administrator.',
    };
  }
  return {
    subject: 'Du er invitert til Endwise-support',
    ingress: 'Du er invitert til Endwise-support.',
    side: 'Du er invitert til Endwise-support.',
  };
}

/** Kontekster når aktiv org er plattform-tenanten. */
export const PLATFORM_KONTEKST = {
  key: 'endwise' as const,
  label: 'Endwise',
  hint: 'Forhandlere, innboks, flagg',
  subtitle: 'Plattform',
  headerNavn: 'Endwise',
};

export function verkstedInspectBase(slug: string): string {
  return `/endwise/verksted/${slug}`;
}

export function remapHrefTilInspect(href: string, slug: string): string {
  const [path, query] = href.split('?');
  const mapped = `${verkstedInspectBase(slug)}${path === '/' ? '' : path}`;
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

/** Skrivehandlinger som skal være disabled i Se verkstedet. */
export const LESING_HANDLINGER = [
  'Ny booking',
  'Ny jobb',
  'Ny melding',
  'Ny kunde',
  'Send',
  'Lagre',
  'Slett',
  'Inviter',
  'Endre pakke',
  'Send invitasjon på nytt',
] as const;

export const LESING_TITLE = 'Kun lesing';

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
    pathname.startsWith('/kunder') ||
    pathname.startsWith('/kjoretoy') ||
    pathname.startsWith('/samarbeid') ||
    pathname.startsWith('/analyse') ||
    pathname.startsWith('/ai-') ||
    pathname.startsWith('/support') ||
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
    pathname.startsWith('/mekanikere')
  );
}
