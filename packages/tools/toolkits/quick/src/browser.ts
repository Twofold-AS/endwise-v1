/**
 * Nettleser-inngang for F1-07-proben. Importer denne — ikke `.` — fra
 * klientkode, så `client.ts` / `@endwise/modules` ikke havner i web-bunten.
 *
 * Live GET går fra forhandlerens maskin. Token logges aldri.
 */

export { QuickAuthError, QuickError, QuickSsrfError } from './errors.ts';
export { normalizeQuickBaseUrl, normalizeQuickToken } from './normalize.ts';
export {
  MAX_RESPONSE_BYTES,
  probeQuickReadOnly,
  QUICK_PROBE_USER_AGENT,
  QUICK_READ_ONLY_PROBE_METHOD,
  QUICK_READ_ONLY_PROBE_PATH,
  type QuickProbeConfig,
  quickProbeHeaders,
  quickProbeTargetUrl,
} from './probe.ts';
export { QUICK_PROBE_USER_MESSAGES, quickProbeUserMessage } from './probe-error.ts';
