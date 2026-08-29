/** Alltid tre rad-spor. Kortet endrer ikke høyde. */
export const HJEM_JOBBER_MAX = 3;

export function hjemJobbSlots<T>(jobs: readonly T[]): (T | null)[] {
  const vis = jobs.slice(0, HJEM_JOBBER_MAX);
  return Array.from({ length: HJEM_JOBBER_MAX }, (_, i) => vis[i] ?? null);
}
