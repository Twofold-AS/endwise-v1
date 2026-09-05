'use client';

import { BloubBot } from '@endwise/ui/bloub/BloubBot';
import { useRonnySheet } from './ronny-sheet-state';

const HIT =
  'hidden md:inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg';

/**
 * Desktop-inngang til Ronny — sitter rett til venstre for sidebar-toggle.
 * Skjult på telefon (`hidden md:inline-flex`); telefon bruker PhoneShell.
 */
export function RonnyAvatarKnapp({ className }: { className?: string }) {
  const { apen, apne, lukk } = useRonnySheet();
  return (
    <button
      type="button"
      data-ronny-avatar
      aria-label={apen ? 'Lukk Ronny' : 'Åpne Ronny'}
      aria-expanded={apen}
      className={className ? `${HIT} ${className}` : HIT}
      onClick={() => (apen ? lukk() : apne())}
    >
      <BloubBot
        size={24}
        shape="cercle"
        color="#1d1d1f"
        paper="#f5f5f7"
        state="idle"
        expression="heureux"
        follow={false}
        still
        playing={false}
      />
    </button>
  );
}
