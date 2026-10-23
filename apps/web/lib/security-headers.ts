/**
 * F0-15 — HTTP-sikkerhetsheadere for Next (`headers()` i next.config.ts).
 *
 * CSP starter med det appen faktisk trenger i nettleseren. Mistral-kall og
 * Sentry-init på server/edge er ikke klient-connect. Vercel-preview-toolbar
 * (`vercel.live`) er bevisst ute — den er ikke produktoverflate.
 *
 * Widget / Framer: booking-widgeten er en JS-komponent (`@endwise/widget-ui`)
 * som kaller `/widget/*` med CORS. Den er ikke et iframe av Endwise-HTML.
 * Framer-pluginen hostes av Framer, ikke av denne Next-appen. Derfor er
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` riktig på alle Next-ruter
 * inkludert `/widget/*` (JSON-API). CORS eies av Hono (`widgetCors`), aldri
 * `Access-Control-Allow-Origin: *` (ZAP 10098).
 */

export type HttpHeader = { key: string; value: string };

export interface SikkerhetsHeaderValg {
  /** `next dev` trenger `'unsafe-eval'` (React-debug). Produksjonsbygg gjør ikke. */
  development?: boolean;
}

/** Ruter som er ment å kalles cross-origin av embed (JS + CORS, ikke iframe). */
export const WIDGET_API_KILDE = '/widget/:path*';

export function innholdssikkerhetsPolicy(valg: SikkerhetsHeaderValg = {}): string {
  const development = valg.development ?? process.env.NODE_ENV !== 'production';
  const scriptSrc = development
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Same-origin API + MapLibre-demofliser på Marked/live. Sentry-klient
    // (withSentryConfig) kan poste til ingest; Mistral er server-side.
    [
      "connect-src 'self'",
      'https://demotiles.maplibre.org',
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
    ].join(' '),
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function tillatelsesPolicy(): string {
  return [
    'accelerometer=()',
    'autoplay=()',
    'bluetooth=()',
    'camera=()',
    'display-capture=()',
    'geolocation=()',
    'gyroscope=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'usb=()',
    'xr-spatial-tracking=()',
    'browsing-topics=()',
  ].join(', ');
}

/**
 * Headere som settes på alle Next-ruter. Ingen CORS-header her — `*` er
 * forbudt, og widget-API-et ekko-er kun normalisert origin i Hono.
 */
export function sikkerhetsHeadere(valg: SikkerhetsHeaderValg = {}): HttpHeader[] {
  return [
    { key: 'Content-Security-Policy', value: innholdssikkerhetsPolicy(valg) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: tillatelsesPolicy() },
  ];
}
