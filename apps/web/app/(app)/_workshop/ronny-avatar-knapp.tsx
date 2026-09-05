'use client';

import { RonnyBot, useRonnySpinn } from './ronny-bot';
import { useRonnySheet } from './ronny-sheet-state';

const HIT =
  'hidden md:inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg';

/**
 * Desktop-inngang til Ronny — sitter rett til venstre for sidebar-toggle.
 * Skjult på telefon (`hidden md:inline-flex`); telefon bruker PhoneShell.
 */
export function RonnyAvatarKnapp({ className }: { className?: string }) {
  const { apen, apne, lukk } = useRonnySheet();
  const { spin, trigg } = useRonnySpinn();
  return (
    <button
      type="button"
      data-ronny-avatar
      aria-label={apen ? 'Lukk Ronny' : 'Åpne Ronny'}
      aria-expanded={apen}
      className={className ? `${HIT} ${className}` : HIT}
      onClick={() => {
        trigg();
        if (apen) lukk();
        else apne();
      }}
    >
      <RonnyBot size={24} paper="#f5f5f7" spin={spin} />
    </button>
  );
}
