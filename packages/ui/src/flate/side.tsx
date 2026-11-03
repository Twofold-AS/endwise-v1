'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from '../icons.ts';
import { cn } from '../lib/utils.ts';
import { useLenkeRender } from './lenke.tsx';

/** Delt sidemal: tittel, undertekst, primærhandling, seksjoner. Chrome urørt. */
export function Side({
  tittel,
  undertekst,
  handling,
  tilbakeHref,
  tilbakeLabel,
  children,
  className,
}: {
  tittel: string;
  undertekst?: string;
  handling?: ReactNode;
  tilbakeHref?: string;
  tilbakeLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-side className={cn('flex flex-col gap-4 max-md:px-4 max-md:py-4', className)}>
      <SideTopp
        tittel={tittel}
        undertekst={undertekst}
        handling={handling}
        tilbakeHref={tilbakeHref}
        tilbakeLabel={tilbakeLabel}
      />
      {children}
    </div>
  );
}

/** Sidetopp i innholdet (scroller bort). Pil 44×44, tittel, valgfri Ny. */
export function SideTopp({
  tittel,
  undertekst,
  handling,
  tilbakeHref,
  tilbakeLabel = 'Tilbake',
}: {
  tittel: string;
  undertekst?: string;
  handling?: ReactNode;
  tilbakeHref?: string;
  tilbakeLabel?: string;
}) {
  const renderLenke = useLenkeRender();
  const pil = (
    <>
      <ArrowLeft size={20} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{tilbakeLabel}</span>
    </>
  );
  const pilKlasse =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg hover:bg-surface-2';

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-1">
        {tilbakeHref ? (
          renderLenke ? (
            renderLenke({
              href: tilbakeHref,
              className: pilKlasse,
              children: pil,
            })
          ) : (
            <a href={tilbakeHref} className={pilKlasse} aria-label={tilbakeLabel}>
              {pil}
            </a>
          )
        ) : null}
        <div className="min-w-0">
          <h1 className="text-title text-fg max-md:text-[24px] max-md:leading-[1.2] max-md:font-[650]">
            {tittel}
          </h1>
          {undertekst ? <p className="mt-0.5 text-body text-fg-muted">{undertekst}</p> : null}
        </div>
      </div>
      {handling ? <div className="shrink-0">{handling}</div> : null}
    </header>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-title text-fg max-md:text-[18px] max-md:font-[650]">
          {tittel}
          {antall != null && antall > 0 ? (
            <span className="text-meta text-fg-muted tabular-nums">{antall}</span>
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
  handlinger,
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
  handlinger?: ReactNode;
}) {
  const renderLenke = useLenkeRender();
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
          <span className="mt-0.5 block truncate text-meta text-fg-muted">{undertekst}</span>
        ) : null}
        {children}
      </span>
      {hoyre ? <span className="shrink-0 text-label text-fg-muted">{hoyre}</span> : null}
      {handlinger}
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
    if (renderLenke) {
      return (
        <span data-liste-rad className="contents">
          {renderLenke({ href, className: klasser, children: innhold })}
        </span>
      );
    }
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
