/**
 * Jobb-statusmerker — myk tint, ingen pip / border-left.
 * Katalog: Planlagt · Pågår · Ferdig · Flyttet · Avvik · Forespørsel · Hentet
 */

export const JOBB_STATUS_LABEL = {
  draft: 'Utkast',
  confirmed: 'Planlagt',
  in_progress: 'Pågår',
  completed: 'Ferdig',
  cancelled: 'Avlyst',
  no_show: 'Møtte ikke',
  flyttet: 'Flyttet',
  avvik: 'Avvik',
  foresporsel: 'Forespørsel',
  hentet: 'Hentet',
} as const;

export type JobbStatusNokkel = keyof typeof JOBB_STATUS_LABEL;

/** Myk tint-stige — aldri pip, aldri border-left, aldri #0066ff. */
export const JOBB_STATUS_TONE: Record<JobbStatusNokkel, string> = {
  draft: 'bg-surface-2 text-fg-muted',
  confirmed: 'bg-surface-2 text-fg',
  in_progress: 'bg-warn-soft text-warn',
  completed: 'bg-success-soft text-success',
  cancelled: 'bg-surface-2 text-fg-muted',
  no_show: 'bg-danger-soft text-danger',
  flyttet: 'bg-surface-2 text-fg',
  avvik: 'bg-warn-soft text-warn',
  foresporsel: 'bg-surface-2 text-fg-muted',
  hentet: 'bg-success-soft text-success',
};

const NOTE_STATUS: { prefix: string; nokkel: JobbStatusNokkel }[] = [
  { prefix: '[HENTET', nokkel: 'hentet' },
  { prefix: '[FLYTTET', nokkel: 'flyttet' },
  { prefix: '[AVVIK', nokkel: 'avvik' },
  { prefix: '[FORESPOR', nokkel: 'foresporsel' },
];

export function jobbStatusFraNotat(
  status: string | null | undefined,
  notes: string | null | undefined,
): JobbStatusNokkel {
  const tekst = notes ?? '';
  for (const rad of NOTE_STATUS) {
    if (tekst.includes(rad.prefix)) return rad.nokkel;
  }
  if (status && status in JOBB_STATUS_LABEL) return status as JobbStatusNokkel;
  return 'confirmed';
}

export function StatusMerke({
  status,
  notes,
  className = '',
}: {
  status?: string | null;
  notes?: string | null;
  className?: string;
}) {
  const nokkel = jobbStatusFraNotat(status, notes);
  return (
    <span
      data-status-merke={nokkel}
      className={`inline-flex h-badge items-center rounded-badge px-2 text-[11px] font-[450] ${JOBB_STATUS_TONE[nokkel]} ${className}`}
    >
      {JOBB_STATUS_LABEL[nokkel]}
    </span>
  );
}
