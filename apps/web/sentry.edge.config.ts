import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Ingen PII til Sentry (GDPR — techstack §2 Hosting fra1/EU).
  sendDefaultPii: false,
});
