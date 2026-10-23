/**
 * F0-15 — HTTP-sikkerhetsheadere for Next (`headers()` i next.config.ts).
 *
 * CSP starter med det appen faktisk trenger i nettleseren. Mistral-kall er
 * server-side og står ikke i `connect-src`. Sentry-ingest tas fra DSN-host
 * (ikke `*.sentry.io`). DSN er tom til F0-14; EU-region er
 * `*.ingest.de.sentry.io` når DSN peker dit.
 *
 * ACAO `*` på rot-HTML (ZAP 10098): kommer fra Vercel (`server: Vercel`),
 * ikke fra `headers()` her og ikke fra Deployment Protection (preview er
 * 200 uten auth-utfordring). Samme `*` ligger på **produksjon** `endwise.no`
 * (prerender + `x-vercel-cache: HIT`). Vi setter aldri `*`.
 *
 * Widget / Framer: JS-komponent + CORS, ikke iframe. Derfor
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` på alle Next-ruter.
 */

export type HttpHeader = { key: string; value: string };

export interface SikkerhetsHeaderValg {
  /** `next dev` trenger `'unsafe-eval'` (React-debug). Produksjonsbygg gjør ikke. */
  development?: boolean;
  /** Overstyr DSN i tester. Default: `process.env.SENTRY_DSN`. */
  sentryDsn?: string;
}

/** Ruter som er ment å kalles cross-origin av embed (JS + CORS, ikke iframe). */
export const WIDGET_API_KILDE = '/widget/:path*';

export const HSTS_VERDI = 'max-age=63072000; includeSubDomains; preload';
export const CSP_REPORT_GRUPPE = 'csp-endpoint';
export const CSP_REPORT_STI = '/csp-report';
export const AUTH_NO_STORE = 'private, no-store, no-cache, must-revalidate';

/** Host fra Sentry-DSN (`https://key@o1.ingest.de.sentry.io/2` → `o1.ingest.de.sentry.io`). */
export function sentryIngestFraDsn(dsn: string | undefined | null): string | null {
  if (!dsn) return null;
  try {
    const host = new URL(dsn).hostname.toLowerCase();
    if (!host.endsWith('.sentry.io')) return null;
    return host;
  } catch {
    return null;
  }
}

/** EU-Sentry bruker `ingest.de.sentry.io` (eller `.eu.`). US/global er `ingest.sentry.io`. */
export function sentryErEu(host: string | null): boolean {
  if (!host) return false;
  return (
    host === 'ingest.de.sentry.io' ||
    host.endsWith('.ingest.de.sentry.io') ||
    host === 'ingest.eu.sentry.io' ||
    host.endsWith('.ingest.eu.sentry.io')
  );
}

export function innholdssikkerhetsPolicy(valg: SikkerhetsHeaderValg = {}): string {
  const development = valg.development ?? process.env.NODE_ENV !== 'production';
  const scriptSrc = development
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const sentryHost = sentryIngestFraDsn(
    valg.sentryDsn !== undefined ? valg.sentryDsn : process.env.SENTRY_DSN,
  );
  const connect = ["connect-src 'self'", 'https://demotiles.maplibre.org'];
  if (sentryHost) connect.push(`https://${sentryHost}`);

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    connect.join(' '),
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
    `report-to ${CSP_REPORT_GRUPPE}`,
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
 * forbudt, og widget-API-et speiler kun nøkkelens allowedOrigins i Hono.
 */
export function sikkerhetsHeadere(valg: SikkerhetsHeaderValg = {}): HttpHeader[] {
  const development = valg.development ?? process.env.NODE_ENV !== 'production';
  const ut: HttpHeader[] = [
    { key: 'Content-Security-Policy', value: innholdssikkerhetsPolicy(valg) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: tillatelsesPolicy() },
    { key: 'Reporting-Endpoints', value: `${CSP_REPORT_GRUPPE}="${CSP_REPORT_STI}"` },
  ];
  if (!development) {
    ut.push({ key: 'Strict-Transport-Security', value: HSTS_VERDI });
  }
  return ut;
}
