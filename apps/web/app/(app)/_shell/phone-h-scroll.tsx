'use client';

import { ChevronLeft } from '@endwise/ui';
import { type ReactNode, useEffect, useRef } from 'react';
import { laasAktivMotStart, PHONE_H_SCROLL, scrollTilbake } from './phone-chrome';

/**
 * Horisontal telefon-rad med #80 end-spacer.
 * Tilbake-pilen sitter i det tomme feltet etter siste låste punkt.
 * Ingen hover, ingen aktiv/valgt — den er ikke en destinasjon.
 */
export function PhoneHScroll({
  children,
  lockKey,
  className = '',
  telefonBareSpacer = false,
}: {
  children: ReactNode;
  lockKey: string;
  className?: string;
  /** Organisasjon top-bar 2 er synlig på desktop — spacer bare under md. */
  telefonBareSpacer?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const forsteScroll = useRef(true);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return;

    const telefon = () => window.matchMedia('(max-width: 767px)').matches;
    const skalLaase = () => !telefonBareSpacer || telefon();

    const laas = (instant: boolean) => {
      if (!skalLaase()) return;
      laasAktivMotStart(scroller, spacer, instant);
    };
    const instant = forsteScroll.current;
    forsteScroll.current = false;
    const ramme = requestAnimationFrame(() => laas(instant));

    const ro = new ResizeObserver(() => laas(true));
    ro.observe(scroller);
    const aktiv =
      scroller.querySelector<HTMLElement>('[aria-current="page"]') ??
      scroller.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (aktiv) ro.observe(aktiv);

    return () => {
      cancelAnimationFrame(ramme);
      ro.disconnect();
    };
  }, [lockKey, telefonBareSpacer]);

  return (
    <div
      ref={scrollerRef}
      className={`flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-2 ${PHONE_H_SCROLL} ${className}`}
    >
      {children}
      <div
        ref={spacerRef}
        data-end-spacer
        className={`pointer-events-none shrink-0 items-center overflow-hidden pl-1 ${
          telefonBareSpacer ? 'hidden max-md:flex' : 'flex'
        }`}
      >
        <button
          type="button"
          data-scroll-tilbake
          aria-label="Rull tilbake"
          onClick={() => {
            const scroller = scrollerRef.current;
            if (scroller) scrollTilbake(scroller);
          }}
          className="pointer-events-auto inline-flex size-8 shrink-0 items-center justify-center text-fg-muted"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
