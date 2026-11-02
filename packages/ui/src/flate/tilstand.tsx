'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '../components/base/skeleton/skeleton.tsx';
import { CircleAlert } from '../icons.ts';
import { cn } from '../lib/utils.ts';

/** Tom flate med ærlig tekst og valgfri handling. Ingen «ikke tilgjengelig ennå». */
export function TomFlate({
  tittel,
  hint,
  handling,
  className,
}: {
  tittel: string;
  hint?: string;
  handling?: ReactNode;
  className?: string;
}) {
  return (
    <div data-tom-flate className={cn('px-1 py-10 text-center', className)}>
      <p className="text-label text-fg">{tittel}</p>
      {hint ? <p className="mt-1 text-[12px] text-fg-muted">{hint}</p> : null}
      {handling ? <div className="mt-4 flex justify-center">{handling}</div> : null}
    </div>
  );
}

const LASTER_NOKLER = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/** Lasteskjelett formet som innhold. AI-lastere (matrix-loaders) brukes ikke her. */
export function LasterFlate({
  linjer = 4,
  className,
  label = 'Laster',
}: {
  linjer?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      data-laster-flate
      role="status"
      className={cn('flex flex-col gap-2 py-4', className)}
      aria-busy="true"
      aria-label={label}
    >
      {LASTER_NOKLER.slice(0, linjer).map((nokkel) => (
        <Skeleton key={nokkel} className="h-11 w-full rounded-sm" />
      ))}
    </div>
  );
}

export function FeilFlate({ melding, className }: { melding: string; className?: string }) {
  return (
    <div data-feil-flate role="alert" className={cn('flex items-start gap-3 py-6', className)}>
      <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
      <p className="text-body text-danger">{melding}</p>
    </div>
  );
}
