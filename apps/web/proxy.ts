import {
  erAuthSti,
  erWhiteLabelAktiv,
  lesKontekst,
  opplosTenantFraHost,
  ruteFraSone,
  slaaOppEgetDomene,
  UKJENT_KUNDE_STI,
} from '@endwise/modules/tenant-host';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_NO_STORE = 'private, no-store, no-cache, must-revalidate';

export type ProxyEnv = Record<string, string | undefined>;

function settAuthNoStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', AUTH_NO_STORE);
  res.headers.set('CDN-Cache-Control', 'no-store');
  res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  return res;
}

function medSone(
  res: NextResponse,
  sone: string,
  slug: string | null,
  auth: boolean,
): NextResponse {
  res.headers.set('x-endwise-sone', sone);
  if (slug) res.headers.set('x-endwise-slug', slug);
  return auth ? settAuthNoStore(res) : res;
}

/**
 * Next 16 proxy (tidligere middleware).
 * Uten flagg: no-op unntatt no-store på /signin, /2fa-oppsett, /api/auth.
 * Bak ENDWISE_WHITE_LABEL=1 (eller SPIKE): sone fra Host, rewrite til
 * /_kunde eller /_plattform. Ingen database.
 */
export function proxy(request: NextRequest, env: ProxyEnv = process.env) {
  const path = request.nextUrl.pathname;
  const auth = erAuthSti(path);

  if (!erWhiteLabelAktiv(env)) {
    const res = NextResponse.next();
    return auth ? settAuthNoStore(res) : res;
  }

  const headers = new Headers(request.headers);
  headers.delete('x-endwise-sone');
  headers.delete('x-endwise-slug');
  headers.delete('x-endwise-kontekst');

  const host = request.headers.get('host');
  const opplosning = opplosTenantFraHost(host, {
    rotDomene: env.TENANT_ROOT_DOMAIN ?? 'endwise.no',
    egetDomeneSlug: slaaOppEgetDomene(host ?? ''),
    vercelEnv: env.VERCEL_ENV,
    previewSlug: request.headers.get('x-tenant-slug') ?? request.nextUrl.searchParams.get('tenant'),
  });

  const kontekst = lesKontekst(
    request.nextUrl.searchParams.get('kontekst') ?? request.headers.get('x-endwise-kontekst'),
    env.VERCEL_ENV,
  );

  headers.set('x-endwise-sone', opplosning.sone);
  if (opplosning.slug) headers.set('x-endwise-slug', opplosning.slug);
  if (kontekst) headers.set('x-endwise-kontekst', kontekst);

  const rute = ruteFraSone({
    sone: opplosning.sone,
    slug: opplosning.slug,
    path,
    kontekst,
  });

  const requestInit = { request: { headers } };
  const slugUt = rute.type === 'not-found' ? null : opplosning.slug;

  if (rute.type === 'not-found') {
    const url = request.nextUrl.clone();
    url.pathname = UKJENT_KUNDE_STI;
    return medSone(NextResponse.rewrite(url, requestInit), opplosning.sone, slugUt, auth);
  }

  if (rute.type === 'rewrite') {
    const url = request.nextUrl.clone();
    url.pathname = rute.dest;
    return medSone(NextResponse.rewrite(url, requestInit), opplosning.sone, slugUt, auth);
  }

  return medSone(NextResponse.next(requestInit), opplosning.sone, slugUt, auth);
}

export const config = {
  matcher: [
    '/signin',
    '/signin/:path*',
    '/2fa-oppsett',
    '/2fa-oppsett/:path*',
    '/api/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
