/**
 * F1-07 — Aktiver Quick-nøkkel FØRST etter vellykket GET-probe.
 *
 * Rekkefølge er hele poenget: probe → persist → (valgfritt) enable.
 * Feiler proben, kalles verken persist eller enable. Tokenet logges ikke.
 * Persist får normalisert URL (origin + shop-slug) og nøkkel uten wrapper.
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

export async function aktiverQuickEtterGet<T>(opts: {
  probe: (cfg: QuickNokkel) => Promise<T>;
  persist: (cfg: QuickNokkel) => Promise<void>;
  enableModule?: () => Promise<void>;
  baseUrl: string;
  token: string;
}): Promise<T> {
  const baseUrl = normalizeQuickBaseUrl(opts.baseUrl);
  const token = normalizeQuickToken(opts.token);
  const probed = await opts.probe({ baseUrl, token });
  await opts.persist({ baseUrl, token });
  await opts.enableModule?.();
  return probed;
}
