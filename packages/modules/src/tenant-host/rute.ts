import type { VertSone } from './opplos.ts';

/** Kundesidens stier. Må ikke kollidere med (app). */
export const KUNDE_STIER = [
  '/',
  '/bestill',
  '/min-side',
  '/logg-inn',
  '/velg',
  '/bookinger',
  '/kjoretoy',
  '/profil',
  '/meldinger',
  '/deler',
  '/kvitteringer',
  '/mine-data',
  '/personvern',
] as const;

export type VertKontekst = 'privat' | 'bedrift';

export type VertRute = { type: 'next' } | { type: 'rewrite'; dest: string } | { type: 'not-found' };

const API_PREFIKS = ['/api/', '/trpc/', '/stream/'];
const STATISK_PREFIKS = ['/_next/', '/logo/', '/favicon'];

export function erKundeSti(path: string): boolean {
  const p = normaliserSti(path);
  return (KUNDE_STIER as readonly string[]).includes(p);
}

export function normaliserSti(path: string): string {
  if (!path || path === '/') return '/';
  const utenQuery = path.split('?')[0] ?? path;
  if (utenQuery.length > 1 && utenQuery.endsWith('/')) return utenQuery.slice(0, -1);
  return utenQuery;
}

export function erApiEllerStatisk(path: string): boolean {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (API_PREFIKS.some((x) => p.startsWith(x))) return true;
  if (STATISK_PREFIKS.some((x) => p.startsWith(x))) return true;
  if (p === '/favicon.ico' || p === '/manifest.webmanifest' || p === '/robots.txt') return true;
  return false;
}

export function erAuthSti(path: string): boolean {
  const p = normaliserSti(path);
  return (
    p === '/signin' ||
    p.startsWith('/signin/') ||
    p === '/logg-inn' ||
    p.startsWith('/logg-inn/') ||
    p === '/2fa-oppsett' ||
    p.startsWith('/2fa-oppsett/') ||
    p.startsWith('/api/auth/')
  );
}

/** Admin-flater som bare skal treffes på platform-verten. */
export function erPlattformAdminSti(path: string): boolean {
  const p = normaliserSti(path);
  return (
    p === '/endwise' ||
    p.startsWith('/endwise/') ||
    p === '/admin' ||
    p.startsWith('/admin/') ||
    p === '/2fa-oppsett' ||
    p.startsWith('/2fa-oppsett/')
  );
}

/**
 * Ingen DB. Proxyen bruker denne til rewrite/404.
 * Ukjent/reservert → nøytral 404-rute uten slug.
 * Forhandler + (app)-sti uten Bedrift → /logg-inn.
 */
/** Nøytral 404 uten slug. Brukes av proxyen — ingen DB. */
export const UKJENT_KUNDE_STI = '/_kunde/_ukjent';

export function ruteFraSone(input: {
  sone: VertSone;
  slug: string | null;
  path: string;
  kontekst: VertKontekst | null;
}): VertRute {
  const path = normaliserSti(input.path);
  if (erApiEllerStatisk(input.path)) return { type: 'next' };

  if (input.sone === 'marked') {
    if (erPlattformAdminSti(path)) return { type: 'not-found' };
    return { type: 'next' };
  }

  if (input.sone === 'platform') {
    if (path === '/_plattform' || path.startsWith('/_plattform/')) return { type: 'next' };
    if (path === '/') return { type: 'rewrite', dest: '/_plattform' };
    if (
      path === '/logg-inn' ||
      path.startsWith('/logg-inn/') ||
      path === '/signin' ||
      path.startsWith('/signin/')
    ) {
      return { type: 'rewrite', dest: '/_plattform/logg-inn' };
    }
    if (erPlattformAdminSti(path)) return { type: 'next' };
    return { type: 'rewrite', dest: '/_plattform' };
  }

  if (input.sone === 'app') {
    if (path === '/_bedrift' || path.startsWith('/_bedrift/')) return { type: 'next' };
    if (
      path === '/' ||
      path === '/logg-inn' ||
      path.startsWith('/logg-inn/') ||
      path === '/signin' ||
      path.startsWith('/signin/')
    ) {
      return { type: 'rewrite', dest: '/_bedrift/logg-inn' };
    }
    if (erPlattformAdminSti(path) || path.startsWith('/_kunde') || path.startsWith('/_plattform')) {
      return { type: 'not-found' };
    }
    if (erKundeSti(path)) return { type: 'not-found' };
    return { type: 'next' };
  }

  if (input.sone === 'reservert' || input.sone === 'ukjent') {
    return { type: 'not-found' };
  }

  const slug = input.slug;
  if (!slug) return { type: 'not-found' };

  if (path.startsWith('/_kunde') || path.startsWith('/_plattform') || erPlattformAdminSti(path)) {
    return { type: 'not-found' };
  }

  const internKunde = path === '/signin' ? '/logg-inn' : path === '/velg' ? '/min-side' : path;
  if (erKundeSti(internKunde) || internKunde === '/logg-inn' || internKunde === '/min-side') {
    const dest = internKunde === '/' ? `/_kunde/${slug}` : `/_kunde/${slug}${internKunde}`;
    return { type: 'rewrite', dest };
  }

  return { type: 'not-found' };
}

/**
 * Preview/dev: ?kontekst=bedrift eller x-endwise-kontekst.
 * Produksjon ignorerer query/header — sesjon kommer i F7.
 */
export function lesKontekst(
  verdi: string | null | undefined,
  vercelEnv: string | undefined,
): VertKontekst | null {
  const v = verdi?.trim().toLowerCase();
  if (v !== 'bedrift' && v !== 'privat') return null;
  if (vercelEnv === 'production') return null;
  return v;
}
