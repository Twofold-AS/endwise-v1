/**
 * Delt status-lag for booking-UI (liste, detalj, «Min dag»). Speiler
 * booking-livssyklusen i `@endwise/modules` (F3-01). Klienten bruker dette kun
 * til å vise/grå ut knapper — serveren håndhever den ekte maskinen (assertTransition).
 */
export type BookingStatus =
  | 'draft'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Utkast',
  confirmed: 'Planlagt',
  in_progress: 'Pågår',
  completed: 'Ferdig',
  cancelled: 'Avlyst',
  no_show: 'Møtte ikke',
};

/** Tekst/bakgrunn per status (tema-tokens, mørkt tema). */
export const STATUS_TONE: Record<string, string> = {
  draft: 'text-fg-muted bg-surface-2',
  confirmed: 'text-primary bg-primary/12',
  in_progress: 'text-warn bg-warn/12',
  completed: 'text-success bg-success/12',
  cancelled: 'text-danger bg-danger/12',
  no_show: 'text-danger bg-danger/12',
};

/** Lovlige overganger — speil av lifecycle.ts sin transitions. */
export const ALLOWED_TRANSITIONS: Record<string, BookingStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Knappetekst for en overgang (verb, ikke tilstand). */
export const TRANSITION_LABEL: Record<string, string> = {
  confirmed: 'Bekreft',
  in_progress: 'Start',
  completed: 'Fullfør',
  cancelled: 'Avlys',
  no_show: 'Møtte ikke',
};

export const ALL_STATUSES: BookingStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export function fmtTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(d: Date | string): string {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

export function estMinutes(from: Date | string, to: Date | string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

/** Øre → «1 250 kr». null → «—». */
export function fmtMinor(minor: number | null | undefined): string {
  if (minor == null) return '—';
  return `${(minor / 100).toLocaleString('nb-NO', { maximumFractionDigits: 0 })} kr`;
}

/** Flere tjenester på én jobb: «EU-kontroll + oljeskift». */
export function fmtServices(b: {
  serviceNames?: readonly (string | null)[] | null;
  serviceName?: string | null;
}): string {
  const names = (b.serviceNames ?? []).filter((n): n is string => Boolean(n?.trim()));
  if (names.length > 0) return names.join(' + ');
  return b.serviceName ?? 'Tjeneste';
}
