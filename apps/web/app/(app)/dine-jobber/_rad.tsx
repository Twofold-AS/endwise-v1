'use client';

import { Bike, ChevronRight, Sailboat } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { kjoretoyIkon } from '../_shell/forhandler-kort';
import { fmtTime } from '../bookinger/_status';

export function KjoretoyMerke({ type }: { type: string | null | undefined }) {
  const kind = kjoretoyIkon(type);
  const Icon = kind === 'boat' ? Sailboat : Bike;
  const label = kind === 'boat' ? 'BÅT' : kind === 'atv' ? 'ATV' : 'MC';
  return (
    <span className="inline-flex h-control w-12 shrink-0 flex-col items-center justify-center rounded-control bg-surface-2 text-[10px] text-fg">
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function JobbRad({
  id,
  startsAt,
  vehicleType,
  customerName,
}: {
  id: string;
  startsAt: Date | string;
  vehicleType: string | null | undefined;
  customerName: string | null | undefined;
}) {
  return (
    <Link
      href={`/min-dag/${id}` as Route}
      className="flex h-row-store items-center gap-3 rounded-xl border border-border bg-card px-3 text-fg"
    >
      <span className="w-12 shrink-0 text-title tabular-nums">{fmtTime(startsAt)}</span>
      <KjoretoyMerke type={vehicleType} />
      <span className="min-w-0 flex-1 truncate text-title">{customerName ?? 'Ukjent kunde'}</span>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-fg-muted"
        aria-label="Detaljer"
      />
    </Link>
  );
}
