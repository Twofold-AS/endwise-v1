'use client';

import { KUNDER_ALFA, type KunderAlfa } from './_alfa';

/**
 * Claude §4.9 — bokstaver ned høyre kant (absolute), ikke topp-chips.
 * Mobbin-tokens: aktiv `text-fg` 700, ellers `text-fg-muted` 500.
 */
export function KunderAlfaRail({
  valgt,
  onVelg,
}: {
  valgt: KunderAlfa;
  onVelg: (bokstav: KunderAlfa) => void;
}) {
  return (
    <nav
      data-kunder-alfa-rail
      aria-label="Alfabet"
      className="absolute top-0 right-1 bottom-0 z-[3] flex w-[26px] flex-col items-center justify-center gap-[3px]"
    >
      {KUNDER_ALFA.map((bokstav) => {
        const aktiv = bokstav === valgt;
        return (
          <button
            key={bokstav}
            type="button"
            data-kunder-alfa={bokstav}
            aria-pressed={aktiv}
            aria-label={bokstav === '#' ? 'Alle bokstaver' : `Bokstav ${bokstav}`}
            onClick={() => onVelg(bokstav)}
            className={`flex h-[15px] w-5 items-center justify-center p-0 text-[11px] leading-none ${
              aktiv ? 'font-[700] text-fg' : 'font-[500] text-fg-muted'
            }`}
          >
            {bokstav}
          </button>
        );
      })}
    </nav>
  );
}
