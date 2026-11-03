'use client';

import type { ReactNode } from 'react';
import { Chip, type ChipColor } from '../components/base/badges/chip.tsx';
import { CircleQuestionMark, TriangleAlert } from '../icons.ts';

export const STATUS_CHIP = {
  planlagt: { label: 'Planlagt', color: 'soft' },
  pagar: { label: 'Pågår', color: 'yellow' },
  ferdig: { label: 'Ferdig', color: 'lime' },
  flyttet: { label: 'Flyttet', color: 'gray' },
  avvik: { label: 'Avvik', color: 'rose' },
  foresporsel: { label: 'Forespørsel', color: 'yellow' },
  hentet: { label: 'Hentet', color: 'neutral' },
} as const satisfies Record<string, { label: string; color: ChipColor }>;

export type StatusChipNokkel = keyof typeof STATUS_CHIP;

const IKON: Partial<Record<StatusChipNokkel, ReactNode>> = {
  avvik: <TriangleAlert size={12} strokeWidth={2} aria-hidden />,
  foresporsel: <CircleQuestionMark size={12} strokeWidth={2} aria-hidden />,
};

/** Status-TAG. Stadium-pille, ingen pip eller border-left. */
export function StatusChip({
  status,
  children,
}: {
  status: StatusChipNokkel;
  children?: ReactNode;
}) {
  const def = STATUS_CHIP[status];
  return (
    <Chip
      data-status-chip={status}
      variant="caption"
      color={def.color}
      className="gap-1 rounded-pill"
    >
      {IKON[status]}
      {children ?? def.label}
    </Chip>
  );
}

/** Booking-enum → Claude-status. Flyttet/Hentet vises kun når kalt eksplisitt. */
export function statusFraBooking(status: string): StatusChipNokkel {
  switch (status) {
    case 'in_progress':
      return 'pagar';
    case 'completed':
      return 'ferdig';
    case 'draft':
    case 'confirmed':
      return 'planlagt';
    default:
      return 'planlagt';
  }
}
