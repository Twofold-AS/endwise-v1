import { PRODUKT_TIDSSONE } from '../_lib/oslo-dag';

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Utkast',
  confirmed: 'Planlagt',
  in_progress: 'Pågår',
  completed: 'Fullført',
  cancelled: 'Avlyst',
  no_show: 'Møtte ikke',
};

/** Knapper på jobbdetalj — utledet av live status, ikke hardkodet Start+Ferdig. */
export type JobbStatusKnapper = {
  start: boolean;
  stopp: boolean;
  fullfortHandling: boolean;
  fullfortStatus: boolean;
};

export function jobbStatusKnapper(status: string): JobbStatusKnapper {
  if (status === 'completed') {
    return { start: false, stopp: false, fullfortHandling: false, fullfortStatus: true };
  }
  if (status === 'in_progress') {
    return { start: false, stopp: true, fullfortHandling: true, fullfortStatus: false };
  }
  if (status === 'confirmed') {
    return { start: true, stopp: false, fullfortHandling: false, fullfortStatus: false };
  }
  return { start: false, stopp: false, fullfortHandling: false, fullfortStatus: false };
}

export function fmtTime(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PRODUKT_TIDSSONE,
  });
}

export function estMinutes(from: Date | string, to: Date | string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}
