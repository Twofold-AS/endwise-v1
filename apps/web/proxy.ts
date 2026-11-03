import {
  erWhiteLabelSpikeAktiv,
  opplosTenantFraHost,
  slaaOppEgetDomene,
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

/**
 * Next 16 proxy (tidligere middleware).
 * Standard: bare no-store på auth-stier — uendret for endwise.no.
 * Bak ENDWISE_WHITE_LABEL_SPIKE=1: slår opp sone fra Host og setter
 * request-headere. Ingen rewrite, ingen 404, ingen DB.
 */
export function proxy(request: NextRequest, env: ProxyEnv = process.env) {
  if (!erWhiteLabelSpikeAktiv(env)) {
    return settAuthNoStore(NextResponse.next());
  }

  const headers = new Headers(request.headers);
  headers.delete('x-endwise-sone');
  headers.delete('x-endwise-slug');

  const host = request.headers.get('host');
  const opplosning = opplosTenantFraHost(host, {
    rotDomene: env.TENANT_ROOT_DOMAIN ?? 'endwise.no',
    egetDomeneSlug: slaaOppEgetDomene(host ?? ''),
    vercelEnv: env.VERCEL_ENV,
    previewSlug: request.headers.get('x-tenant-slug') ?? request.nextUrl.searchParams.get('tenant'),
  });

  headers.set('x-endwise-sone', opplosning.sone);
  if (opplosning.slug) headers.set('x-endwise-slug', opplosning.slug);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set('x-endwise-sone', opplosning.sone);
  if (opplosning.slug) res.headers.set('x-endwise-slug', opplosning.slug);
  return settAuthNoStore(res);
}

export const config = {
  matcher: ['/signin', '/signin/:path*', '/2fa-oppsett', '/2fa-oppsett/:path*', '/api/auth/:path*'],
};
