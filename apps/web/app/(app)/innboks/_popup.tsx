'use client';

import { type ReactNode, useLayoutEffect, useState } from 'react';
import { PHONE_PROFIL_MENY_BREDDE, PHONE_PROFIL_RAD } from '../_shell/phone-chrome';

/**
 * Plate som profilmenyen — fixed + scrim, så Tid/Gruppe ikke klippes
 * av overflow-hidden på innboks-chrome.
 */
export function InboxChromePopup({
  apen,
  onLukk,
  label,
  anker,
  children,
}: {
  apen: boolean;
  onLukk: () => void;
  label: string;
  anker: HTMLElement | null;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!apen || !anker) return;
    function plasser() {
      if (!anker) return;
      const r = anker.getBoundingClientRect();
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
        data-innboks-popup-scrim
        aria-label="Lukk"
        className="fixed inset-0 z-[70] bg-transparent"
        onClick={onLukk}
      />
      <div
        data-innboks-popup={label}
        role="listbox"
        aria-label={label}
        className={`fixed z-[75] flex ${PHONE_PROFIL_MENY_BREDDE} flex-col overflow-hidden rounded-[16px] border border-border bg-card py-1.5 shadow-lg`}
        style={{ top: pos.top, left: pos.left, width: 260 }}
      >
        {children}
      </div>
    </>
  );
}

export function InboxPopupValg({
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
      className={`${PHONE_PROFIL_RAD} w-full text-left ${valgt ? '' : 'text-fg-muted'}`}
    >
      {children}
    </button>
  );
}
