import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_NO_STORE = 'private, no-store, no-cache, must-revalidate';

/**
 * /signin og /2fa-oppsett leser HttpOnly two_factor / enroll_2fa.
 * En prerendret / cachet HTML fra forrige preview-deploy ser aldri kakene
 * — da lander verify på venteskjerm med brukt token.
 */
export function proxy(_request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('Cache-Control', AUTH_NO_STORE);
  res.headers.set('CDN-Cache-Control', 'no-store');
  res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  return res;
}

export const config = {
  matcher: ['/signin', '/signin/:path*', '/2fa-oppsett', '/2fa-oppsett/:path*', '/api/auth/:path*'],
};
