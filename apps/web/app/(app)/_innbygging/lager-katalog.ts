export type LagerStatusId = 'pa_lager' | 'under_minimum' | 'bestilt';

export const LAGER_STATUS_LABEL: Record<LagerStatusId, string> = {
  pa_lager: 'På lager',
  under_minimum: 'Under minimum',
  bestilt: 'Bestilt på vei',
};

export const LAGER_STATUS_TONE: Record<LagerStatusId, string> = {
  pa_lager: 'bg-success-soft text-success',
  under_minimum: 'bg-warn-soft text-warn',
  bestilt: 'bg-surface-2 text-fg',
};

export function lagerStatusFor(del: {
  underMinimum?: boolean;
  tilgjengelig?: number;
  bestilt?: boolean;
}): LagerStatusId {
  if (del.bestilt) return 'bestilt';
  if (del.underMinimum) return 'under_minimum';
  return 'pa_lager';
}

/** Økt-lokalt til innkjøps-API / updatePart finnes. */
export const LAGER_BESTILT_NOKKEL = 'endwise.lager.bestilt';
export const LAGER_MIN_NOKKEL = 'endwise.lager.min';

function lesJson<T>(nokkel: string, fallback: T): T {
  if (typeof sessionStorage === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(nokkel);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function lesLagerBestilt(): string[] {
  const parsed = lesJson<unknown>(LAGER_BESTILT_NOKKEL, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
}

export function lagreLagerBestilt(ids: readonly string[]) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(LAGER_BESTILT_NOKKEL, JSON.stringify([...ids]));
}

export function lesLagerMin(): Record<string, number> {
  const parsed = lesJson<unknown>(LAGER_MIN_NOKKEL, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: Record<string, number> = {};
  for (const [id, min] of Object.entries(parsed)) {
    if (typeof min === 'number' && Number.isFinite(min)) out[id] = min;
  }
  return out;
}

export function lagreLagerMin(min: ReadonlyMap<string, number> | Record<string, number>) {
  if (typeof sessionStorage === 'undefined') return;
  const obj = min instanceof Map ? Object.fromEntries(min) : min;
  sessionStorage.setItem(LAGER_MIN_NOKKEL, JSON.stringify(obj));
}
