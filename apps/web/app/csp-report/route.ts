/**
 * CSP report-to-endepunkt. Tar imot nettleserrapporter; lagrer ikke PII.
 * Tom 204 — F0-14/Sentry eier feilsporing når DSN finnes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST() {
  return new Response(null, { status: 204 });
}
