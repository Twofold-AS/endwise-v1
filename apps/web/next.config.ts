import { networkInterfaces } from 'node:os';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

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
  transpilePackages: ['@endwise/ui', '@endwise/widget-tokens'],
  typedRoutes: true,
  // F1 — proxy Better-Auth (/api/auth/*) og tRPC (/trpc/*) til apps/api (:3001).
  // Same-origin i nettleseren → sesjonscookie deles uten CORS-krøll.
  //
  // F6-02 — samme grep for SSE-strømmen (apps/stream, :3002). `EventSource` kan
  // ikke sette headere og sender kun cookies same-origin; uten denne rewriten
  // ville sanntidskanalen enten vært uautentisert eller krevd CORS + token i URL.
  // En sesjonstoken i en query-parameter havner i hver eneste tilgangslogg.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
    const stream = process.env.STREAM_INTERNAL_URL ?? 'http://localhost:3002';
    return [
      { source: '/api/auth/:path*', destination: `${api}/api/auth/:path*` },
      { source: '/trpc/:path*', destination: `${api}/trpc/:path*` },
      // F6-18 — strømmende AI-chat for `useChat`. Samme grunn som over: den
      // skal se same-origin ut, så sesjonscookien følger med uten CORS.
      // ⚠️ Next streamer denne videre; rewrites buffrer ikke.
      { source: '/chat/:path*', destination: `${api}/chat/:path*` },
      // F1-10 — OFFENTLIG invitasjons-API i apps/api.
      // ⚠️ FLERTALL med vilje: SIDEN ligger på `/invitasjon/[token]` i Next.
      // Delte de sti, ville Next servert sin egen HTML der klienten venter JSON.
      { source: '/invitasjoner/:path*', destination: `${api}/invitasjoner/:path*` },
      { source: '/stream/:path*', destination: `${stream}/:path*` },
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
