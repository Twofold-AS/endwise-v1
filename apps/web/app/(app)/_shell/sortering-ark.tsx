'use client';

import { type ReactNode, type RefObject, useEffect } from 'react';
import { PHONE_PROFIL_MENY_BREDDE, PHONE_PROFIL_MENY_TOPP } from './phone-chrome';

/**
 * Ett Sortering-ark — Tid/Gruppe, kjøretøytype eller kunde-filter
 * i samme plate under knappen. Tittel «Sortering». Brødtekst som Innstillinger.
 * `absolute` (ikke viewport-fixed) så arket følger ankeret i 390-kolonnen.
 */
export function SorteringArk({
  apen,
  onLukk,
  anker: _anker,
  children,
}: {
  apen: boolean;
  onLukk: () => void;
  anker?: HTMLElement | null | RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  void _anker;

  useEffect(() => {
    if (!apen) return;
    function tast(e: KeyboardEvent) {
      if (e.key === 'Escape') onLukk();
    }
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [apen, onLukk]);

  if (!apen) return null;

  return (
    <>
      <button
        type="button"
        data-sortering-scrim
        data-innboks-popup-scrim
        aria-label="Lukk"
        className="fixed inset-0 z-[70] bg-transparent"
        onClick={onLukk}
      />
      <div
        data-sortering-ark
        data-innboks-popup="Sortering"
        role="dialog"
        aria-label="Sortering"
        className={`absolute ${PHONE_PROFIL_MENY_TOPP} left-0 z-[75] flex ${PHONE_PROFIL_MENY_BREDDE} flex-col overflow-hidden rounded-[16px] border border-border bg-card py-2 shadow-none`}
      >
        <p data-sortering-tittel className="px-4 pb-1 text-body font-[450] text-fg">
          Sortering
        </p>
        {children}
      </div>
    </>
  );
}

export function SorteringGruppe({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <div data-sortering-gruppe={tittel} className="pt-1">
      <p className="px-4 pt-1 pb-0.5 text-label text-fg-muted">{tittel}</p>
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
      className={`flex h-8 w-full items-center px-4 text-left text-body font-[450] leading-none ${
        valgt ? 'text-fg' : 'text-fg-muted'
      }`}
    >
      {children}
    </button>
  );
}
