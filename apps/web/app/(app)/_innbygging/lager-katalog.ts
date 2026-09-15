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
