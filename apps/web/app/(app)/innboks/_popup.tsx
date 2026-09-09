'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import {
  PHONE_PROFIL_MENY_BREDDE,
  PHONE_PROFIL_MENY_TOPP,
  PHONE_PROFIL_RAD,
} from '../_shell/phone-chrome';

/**
 * Plate som profilmenyen — ikke dropdown-chevron, ikke Modus-piller.
 */
export function InboxChromePopup({
  apen,
  onLukk,
  label,
  align = 'left',
  children,
}: {
  apen: boolean;
  onLukk: () => void;
  label: string;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const rot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apen) return;
    function lukk(e: PointerEvent) {
      if (!rot.current?.contains(e.target as Node)) onLukk();
    }
    function tast(e: KeyboardEvent) {
      if (e.key === 'Escape') onLukk();
    }
    document.addEventListener('pointerdown', lukk);
    window.addEventListener('keydown', tast);
    return () => {
      document.removeEventListener('pointerdown', lukk);
      window.removeEventListener('keydown', tast);
    };
  }, [apen, onLukk]);

  if (!apen) return null;

  return (
    <div
      ref={rot}
      data-innboks-popup={label}
      role="listbox"
      aria-label={label}
      className={`absolute z-[75] ${PHONE_PROFIL_MENY_TOPP} ${
        align === 'right' ? 'right-0' : 'left-0'
      } flex ${PHONE_PROFIL_MENY_BREDDE} flex-col overflow-hidden rounded-[16px] border border-border bg-card py-1.5 shadow-lg`}
    >
      {children}
    </div>
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
