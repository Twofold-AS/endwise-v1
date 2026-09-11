'use client';

import { type ReactNode, type RefObject, useLayoutEffect, useState } from 'react';
import { PHONE_PROFIL_MENY_BREDDE } from './phone-chrome';

function lesAnker(anker: HTMLElement | null | RefObject<HTMLElement | null>): HTMLElement | null {
  if (!anker) return null;
  if (typeof anker === 'object' && 'current' in anker) return anker.current;
  return anker;
}

/**
 * Ett Sortering-ark — Tid/Gruppe, kjøretøytype eller kunde-filter
 * i samme fixed+scrim-plate. Tittel «Sortering». Brødtekst som Innstillinger.
 */
export function SorteringArk({
  apen,
  onLukk,
  anker,
  children,
}: {
  apen: boolean;
  onLukk: () => void;
  anker: HTMLElement | null | RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const el = lesAnker(anker);
    if (!apen || !el) return;
    function plasser() {
      const node = lesAnker(anker);
      if (!node) return;
      const r = node.getBoundingClientRect();
      const bredde = Math.min(260, window.innerWidth - 24);
      const left = Math.min(Math.max(12, r.left), window.innerWidth - bredde - 12);
      setPos({ top: r.bottom + 10, left });
    }
    plasser();
    function tast(e: KeyboardEvent) {
      if (e.key === 'Escape') onLukk();
    }
    window.addEventListener('resize', plasser);
    window.addEventListener('keydown', tast);
    return () => {
      window.removeEventListener('resize', plasser);
      window.removeEventListener('keydown', tast);
    };
  }, [apen, anker, onLukk]);

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
        className={`fixed z-[75] flex ${PHONE_PROFIL_MENY_BREDDE} flex-col overflow-hidden rounded-[16px] border border-border bg-card py-2 shadow-none`}
        style={{ top: pos.top, left: pos.left, width: 260 }}
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
