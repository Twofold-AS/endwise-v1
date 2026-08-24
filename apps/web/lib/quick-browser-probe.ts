/**
 * F1-07 — live GET mot Quick fra forhandlerens nettleser.
 *
 * Quick CORS (verifisert 24.08.2026): Access-Control-Allow-Origin: * og
 * Authorization i allow-headers. Tokenet går direkte browser→Quick.
 * User-Agent settes ikke (forbidden + ikke i CORS allow-headers).
 *
 * Kall persist/setConfig FØRST etter at denne løser. Feilet probe lagrer ikke.
 * Token logges aldri.
 */

import {
  probeQuickReadOnly,
  QUICK_PROBE_USER_MESSAGES,
  quickProbeUserMessage,
} from '@endwise/toolkit-quick/browser';

export { QUICK_PROBE_USER_MESSAGES, quickProbeUserMessage };

export async function probeQuickFromBrowser(config: {
  baseUrl: string;
  token: string;
}): Promise<void> {
  try {
    await probeQuickReadOnly({
      baseUrl: config.baseUrl,
      token: config.token,
      includeUserAgent: false,
    });
  } catch (error) {
    throw new Error(quickProbeUserMessage(error));
  }
}

/**
 * Rekkefølge er hele poenget: browser-GET → persist. Persist kalles ikke
 * hvis proben kaster.
 */
export async function persistAfterBrowserQuickProbe<T>(opts: {
  baseUrl: string;
  token: string;
  persist: () => Promise<T>;
}): Promise<T> {
  await probeQuickFromBrowser({ baseUrl: opts.baseUrl, token: opts.token });
  return opts.persist();
}

export function quickBrowserProbeUserMessage(error: unknown): string {
  return quickProbeUserMessage(error);
}
