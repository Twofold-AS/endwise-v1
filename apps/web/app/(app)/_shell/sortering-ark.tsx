'use client';

import { Popover } from '@endwise/ui';
import { type ReactNode, type RefObject, useMemo, useRef } from 'react';
import { PHONE_PROFIL_MENY_BREDDE } from './phone-chrome';

/**
 * Ett Sortering-ark — Tid/Gruppe, kjøretøytype eller kunde-filter
 * i samme plate under knappen. Ingen «Sortering»-heading, ingen seksjons-
 * etiketter. Mindre tekst (`text-label`) så radene får plass.
 * RAC-popover: fokus inne, Escape, fokus tilbake. 16px-plate, ingen skygge.
 */
export function SorteringArk({
  apen,
  onLukk,
  anker,
  children,
}: {
  apen: boolean;
  onLukk: () => void;
  anker?: HTMLElement | null | RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const fallbackRef = useRef<HTMLElement | null>(null);
  const triggerRef = useMemo(() => {
    if (anker && typeof anker === 'object' && 'current' in anker) return anker;
    fallbackRef.current = anker ?? null;
    return fallbackRef;
  }, [anker]);

  return (
    <Popover
      isOpen={apen}
      onOpenChange={(o) => !o && onLukk()}
      triggerRef={triggerRef}
      placement="bottom start"
      offset={4}
      aria-label="Sortering"
      className={`${PHONE_PROFIL_MENY_BREDDE} rounded-[16px] border border-border bg-card p-0 shadow-none`}
      dialogClassName="gap-0 p-0"
    >
      <div
        data-sortering-ark
        data-sortering-scrim
        data-innboks-popup="Sortering"
        data-innboks-popup-scrim
        className="flex flex-col overflow-hidden py-1.5"
      >
        {children}
      </div>
    </Popover>
  );
}

export function SorteringGruppe({ children }: { tittel?: string; children: ReactNode }) {
  return (
    <div data-sortering-gruppe className="pt-0.5">
      {children}
    </div>
  );
}

export function SorteringValg({
  valgt,
  onVelg,
  children,
}: {
  valgt: boolean;
  onVelg: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={valgt}
      onClick={onVelg}
      className={`flex h-7 w-full items-center px-4 text-left text-label font-[450] leading-none ${
        valgt ? 'text-fg' : 'text-fg-muted'
      }`}
    >
      {children}
    </button>
  );
}
