import { registerOTel } from '@vercel/otel';

/** F0-14 — Observability: Vercel Observability + OpenTelemetry + Sentry. */
export async function register() {
  registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME ?? 'endwise-web' });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config.ts');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config.ts');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
