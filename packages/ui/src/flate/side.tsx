'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from '../icons.ts';
import { cn } from '../lib/utils.ts';

/** Delt sidemal: tittel, undertekst, primærhandling, seksjoner. Chrome urørt. */
export function Side({
  tittel,
  undertekst,
  handling,
  children,
  className,
}: {
  tittel: string;
  undertekst?: string;
  handling?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-side className={cn('flex flex-col gap-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{tittel}</h1>
          {undertekst ? <p className="mt-0.5 text-body text-fg-muted">{undertekst}</p> : null}
        </div>
        {handling ? <div className="shrink-0">{handling}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Seksjon({
  tittel,
  antall,
  handling,
  children,
  className,
}: {
  tittel: string;
  antall?: number;
  handling?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section data-seksjon={tittel} className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-title text-fg">
          {tittel}
          {antall != null && antall > 0 ? (
            <span className="text-[12px] text-fg-muted tabular-nums">{antall}</span>
          ) : null}
        </h2>
        {handling}
      </div>
      {children}
    </section>
  );
}

/** Claude liste-rad: tittel, undertekst, høyreverdi, valgfri chevron. Ikke tabell. */
export function ListeRad({
  tittel,
  undertekst,
  hoyre,
  href,
  onClick,
  chevron = true,
  initialer,
  className,
  aktiv,
  children,
}: {
  tittel: string;
  undertekst?: string;
  hoyre?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  initialer?: string;
  className?: string;
  aktiv?: boolean;
  children?: ReactNode;
}) {
  const innhold = (
    <>
      {initialer ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-label text-fg"
        >
          {initialer}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-fg">{tittel}</span>
        {undertekst ? (
          <span className="mt-0.5 block truncate text-[12px] text-fg-muted">{undertekst}</span>
        ) : null}
        {children}
      </span>
      {hoyre ? <span className="shrink-0 text-label text-fg-muted">{hoyre}</span> : null}
      {chevron ? (
        <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-faint" aria-hidden />
      ) : null}
    </>
  );
  const klasser = cn(
    'flex w-full items-center gap-3 border-border border-b py-3 text-left',
    aktiv ? 'bg-sidebar-active' : 'bg-transparent hover:bg-surface-2/60',
    className,
  );
  if (href) {
    return (
      <a href={href} className={klasser} data-liste-rad>
        {innhold}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={klasser} data-liste-rad>
        {innhold}
      </button>
    );
  }
  return (
    <div className={klasser} data-liste-rad>
      {innhold}
    </div>
  );
}
