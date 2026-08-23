import { QuickAuthError, QuickError, QuickSsrfError } from './errors.ts';

/**
 * F1-07 — bruker-synlige BAD_REQUEST for setConfig-proben.
 * Aldri rå fetch-cause (kan bære intern host/IP). Persist kun ved suksess
 * skjer i kallet — meldingene sier at ingenting ble lagret.
 */
export const QUICK_PROBE_USER_MESSAGES = {
  noToken: 'ApiV2-nøkkel mangler. Ingenting er lagret.',
  noUrl: 'Quick-URL mangler. Ingenting er lagret.',
  rejected: 'Quick avviste nøkkelen. Ingenting er lagret.',
  timeout: 'Tidsavbrudd mot Quick. Ingenting er lagret.',
  unreachable: 'Nådde ikke Quick. Ingenting er lagret.',
  unexpected: 'Uventet svar fra Quick. Ingenting er lagret.',
  http500: 'Quick svarte 500 (ofte IP-lås mot Vercel, ikke feil nøkkel)',
} as const;

export function quickProbeUserMessage(error: unknown): string {
  if (error instanceof QuickSsrfError) return error.message;
  if (error instanceof QuickAuthError) return QUICK_PROBE_USER_MESSAGES.rejected;
  if (error instanceof QuickError) {
    if (error.status === 401 || error.status === 403) return QUICK_PROBE_USER_MESSAGES.rejected;
    if (error.status === 500 || /svarte 500\b/.test(error.message)) {
      return QUICK_PROBE_USER_MESSAGES.http500;
    }
    const msg = error.message;
    if (/tidsavbrudd/i.test(msg)) return QUICK_PROBE_USER_MESSAGES.timeout;
    if (/nådde ikke/i.test(msg)) return QUICK_PROBE_USER_MESSAGES.unreachable;
    if (/url mangler/i.test(msg)) return QUICK_PROBE_USER_MESSAGES.noUrl;
    if (/nøkkel mangler|token mangler/i.test(msg)) return QUICK_PROBE_USER_MESSAGES.noToken;
    return QUICK_PROBE_USER_MESSAGES.unexpected;
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return QUICK_PROBE_USER_MESSAGES.timeout;
  }
  return QUICK_PROBE_USER_MESSAGES.unexpected;
}
