/**
 * F3-09 / P3 — linjer og varighet for en jobb.
 *
 * Katalogen gir default-minutter per tjeneste. Slot-lengden kan overstyres
 * manuelt når jobben opprettes. Pris røres ikke her.
 */

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 12 * 60;

export function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function catalogDurationSum(durations: readonly number[]): number {
  return durations.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}

/** Manuell varighet vinner når den er innenfor [5, 720]. Ellers katalogsum. */
export function resolveSlotMinutes(catalogSum: number, manualMinutes?: number | null): number {
  if (manualMinutes != null && Number.isFinite(manualMinutes)) {
    const n = Math.round(manualMinutes);
    if (n >= MIN_DURATION_MINUTES && n <= MAX_DURATION_MINUTES) return n;
  }
  return Math.max(catalogSum, MIN_DURATION_MINUTES);
}

export function endsAtFromDuration(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

export function unionSkills(skillLists: readonly (readonly string[])[]): string[] {
  return uniqueIds(skillLists.flat());
}

export function formatServiceNames(names: readonly (string | null | undefined)[]): string {
  const clean = names.filter((n): n is string => Boolean(n?.trim()));
  if (clean.length === 0) return 'Tjeneste';
  return clean.join(' + ');
}

export function resolveServiceVersionIds(primary: string, extra: readonly string[] = []): string[] {
  return uniqueIds([primary, ...extra]);
}
