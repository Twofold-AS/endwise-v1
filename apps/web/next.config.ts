import { networkInterfaces } from 'node:os';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { streamRewrites } from './lib/rewrites.ts';

/**
 * Maskinens private IPv4-adresser — for `allowedDevOrigins` under.
 *
 * ⚠️ Bevisst duplisert fra `packages/auth/src/dev-origins.ts` (~10 linjer).
 * `next.config.ts` lastes før workspace-pakkene transpileres, og å dra inn
 * `@endwise/auth` — som igjen drar inn Better-Auth og hele db-laget — i en
 * konfigurasjonsfil ville kostet langt mer enn de ti linjene. Endres reglene ett
 * sted, må de endres begge.
 */
function lokaleIPv4(): string[] {
  const ut: string[] = [];
  for (const adresser of Object.values(networkInterfaces())) {
    for (const a of adresser ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const [x, y] = a.address.split('.').map(Number);
      // RFC1918: 10/8 · 172.16/12 · 192.168/16
      const privat = x === 10 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168);
      if (privat) ut.push(a.address);
    }
  }
  return [...new Set(ut)];
}

const nextConfig: NextConfig = {
  /**
   * ⚠️ **DETTE er grunnen til at telefonen ikke fikk appen til å virke.**
   *
   * Fra Next 15.2 blokkeres kryss-origin-forespørsler mot dev-serverens interne
   * ressurser (HMR, `/_next/*`) med mindre origin-en står her. Åpner du
   * `http://192.168.x.x:3000` på telefonen uten dette, laster HTML-en, men
   * JS-chunkene og hot reload blir avvist — siden ser halvferdig eller helt død
   * ut, og feilen står i en konsoll man ikke har på en telefon.
   *
   * Adressene leses fra maskinens EGNE grensesnitt ved oppstart, ikke fra en
   * env-variabel som blir feil neste gang ruteren deler ut en ny IP. Kun
   * private RFC1918-adresser, og bare denne maskinens.
   *
   * ⛔ Gjelder KUN `next dev`. Produksjonsbygget bryr seg ikke om feltet.
   */
  allowedDevOrigins: lokaleIPv4(),
  // Workspace-pakkene distribueres som TS-kilde — Next transpilerer dem.
  // F13-03: `@endwise/api` (og avhengighetene) kjøres INNE i web, ikke via rewrite.
  transpilePackages: [
    '@endwise/api',
    '@endwise/ui',
    '@endwise/widget-tokens',
    '@endwise/auth',
    '@endwise/db',
    '@endwise/events',
    '@endwise/modules',
    '@endwise/agent-runtime',
    '@endwise/agents',
    '@endwise/guardrails',
    '@endwise/providers',
    '@endwise/toolkit-quick',
    '@endwise/toolkit-resend',
    '@endwise/toolkit-twilio',
    '@endwise/toolkit-vegvesen',
  ],
  // `pg` har native optional deps — ikke bundle i serverless-funksjonen.
  serverExternalPackages: ['pg'],
  typedRoutes: true,
  // F13-03 — auth/tRPC/chat/invitasjoner er Next route handlers (same-origin).
  // Bare SSE (`apps/stream`) proxes fortsatt; den hører ikke hjemme på Vercel
  // serverless (permanent LISTEN + 30 min tilkoblinger).
  //
  // F6-02 — `EventSource` kan ikke sette headere og sender kun cookies
  // same-origin; uten denne rewriten ville sanntidskanalen enten vært
  // uautentisert eller krevd CORS + token i URL. En sesjonstoken i en
  // query-parameter havner i hver eneste tilgangslogg.
  async rewrites() {
    return [...streamRewrites(process.env)];
  },
  // F13-03 — agent-instruksjonene (instructions.md ved siden av agent.ts)
  // må inn i JS-bunten. readFileSync + import.meta.url peker på
  // /var/task/packages/agents/src/.../instructions.md, som Turbopack/NFT
  // ikke kopierer. Da krasjer modulevalueringen av @endwise/agents og
  // dermed HELE tRPC-routerens import (også session.me).
  turbopack: {
    rules: {
      '*.md': {
        // Next 16.2.10 (Vercel preview) godtar `raw`, ikke `text`.
        type: 'raw',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
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
