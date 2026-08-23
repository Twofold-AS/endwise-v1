/**
 * F1-07 — Aktiver Quick-nøkkel FØRST etter vellykket GET-probe.
 *
 * Rekkefølge er hele poenget: probe → persist → (valgfritt) enable.
 * Feiler proben, kalles verken persist eller enable. Tokenet logges ikke.
 */

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
  await opts.probe({ baseUrl: opts.baseUrl, token: opts.token });
  await opts.persist({ baseUrl: opts.baseUrl, token: opts.token });
  await opts.enableModule?.();
}
