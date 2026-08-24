/**
 * F1-07 — Aktiver Quick-nøkkel FØRST etter vellykket GET-probe.
 *
 * Rekkefølge er hele poenget: probe → persist → (valgfritt) enable.
 * Feiler proben, kalles verken persist eller enable. Tokenet logges ikke.
 * Persist får normalisert URL (origin + shop-slug) og nøkkel uten wrapper.
 *
 * Live GET mot Quick kjører i nettleseren (dealer-IP). Server-kallstedene
 * (`setConfig`, `onboarding.fullfor`) sender inn en no-op probe — de må ikke
 * GET-e Quick fra Vercel fra1. Persist skjer likevel kun etter at UI har
 * fått 200 fra browser-proben.
 */

import { normalizeQuickBaseUrl, normalizeQuickToken } from '@endwise/toolkit-quick';

export type QuickNokkel = { baseUrl: string; token: string };

export function quickNokkelMangler(
  extras: readonly string[],
  quick?: { baseUrl?: string; token?: string } | null,
): boolean {
  if (!extras.includes('quick')) return false;
  return !quick?.baseUrl?.trim() || !quick.token?.trim();
}

export async function aktiverQuickEtterGet(opts: {
  probe: (cfg: QuickNokkel) => Promise<void>;
  persist: (cfg: QuickNokkel) => Promise<void>;
  enableModule?: () => Promise<void>;
  baseUrl: string;
  token: string;
}): Promise<void> {
  const baseUrl = normalizeQuickBaseUrl(opts.baseUrl);
  const token = normalizeQuickToken(opts.token);
  await opts.probe({ baseUrl, token });
  await opts.persist({ baseUrl, token });
  await opts.enableModule?.();
}
