import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace-pakkene distribueres som TS-kilde — Next transpilerer dem.
  transpilePackages: ['@endwise/ui', '@endwise/widget-tokens'],
  typedRoutes: true,
  // F1 — proxy Better-Auth (/api/auth/*) og tRPC (/trpc/*) til apps/api (:3001).
  // Same-origin i nettleseren → sesjonscookie deles uten CORS-krøll.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
    return [
      { source: '/api/auth/:path*', destination: `${api}/api/auth/:path*` },
      { source: '/trpc/:path*', destination: `${api}/trpc/:path*` },
    ];
  },
  experimental: {
    // React 19.2 native View Transitions (techstack §2 Frontend)
    viewTransition: true,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,

  // Org/prosjekt settes når Sentry-prosjektet finnes (F0-14).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
