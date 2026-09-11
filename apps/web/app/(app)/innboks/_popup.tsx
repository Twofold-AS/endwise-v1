'use client';

import type { ReactNode } from 'react';
import { SorteringArk, SorteringValg } from '../_shell/sortering-ark';

/**
 * Innboks-ark — samme Sortering-plate som Kunder/Tjenester.
 * Beholder data-innboks-popup-hookene for eldre tester.
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
  void label;
  return (
    <SorteringArk apen={apen} onLukk={onLukk} anker={anker}>
      {children}
    </SorteringArk>
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
    <SorteringValg valgt={valgt} onVelg={onVelg}>
      {children}
    </SorteringValg>
  );
}
