import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace-pakkene distribueres som TS-kilde — Next transpilerer dem.
  transpilePackages: ['@endwise/ui', '@endwise/widget-tokens'],
  typedRoutes: true,
  experimental: {
    // React 19.2 native View Transitions (techstack §2 Frontend)
    viewTransition: true,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  // Org/prosjekt settes når Sentry-prosjektet finnes (F0-14).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
