'use client';

import { useRef } from 'react';
import { KUNDER_ALFA, type KunderAlfa } from './_alfa';

/**
 * Apple Contacts-skinne: tap + dra scroller til bokstav.
 * touch-action: none så fingeren ikke scroller lista.
 * Utenfor list-scrollbar (egen kolonne, ikke overlay på overflow).
 */
export function KunderAlfaRail({
  aktiv,
  tomme,
  onVelg,
}: {
  aktiv: KunderAlfa;
  tomme: ReadonlySet<string>;
  onVelg: (bokstav: KunderAlfa) => void;
}) {
  const railRef = useRef<HTMLElement>(null);

  function bokstavFraY(clientY: number): KunderAlfa | null {
    const rot = railRef.current;
    if (!rot) return null;
    const knapper = [...rot.querySelectorAll<HTMLElement>('[data-kunder-alfa]')];
    if (knapper.length === 0) return null;
    const forste = knapper[0]?.getBoundingClientRect();
    const siste = knapper[knapper.length - 1]?.getBoundingClientRect();
    if (!forste || !siste) return null;
    const y = Math.min(Math.max(clientY, forste.top), siste.bottom - 1);
    for (const el of knapper) {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        const merke = el.dataset.kunderAlfa;
        return merke ? (merke as KunderAlfa) : null;
      }
    }
    return null;
  }

  function velgFraY(clientY: number) {
    const bokstav = bokstavFraY(clientY);
    if (!bokstav || tomme.has(bokstav)) return;
    onVelg(bokstav);
  }

  return (
    <nav
      ref={railRef}
      data-kunder-alfa-rail
      aria-label="Alfabet"
      className="z-[4] flex w-[22px] shrink-0 touch-none select-none flex-col items-center py-1"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        velgFraY(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 0 && e.pointerType !== 'touch') return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId) && e.pointerType !== 'touch') return;
        velgFraY(e.clientY);
      }}
    >
      {KUNDER_ALFA.map((bokstav) => {
        const tom = tomme.has(bokstav);
        const valgt = bokstav === aktiv;
        return (
          <button
            key={bokstav}
            type="button"
            data-kunder-alfa={bokstav}
            data-kunder-alfa-tom={tom ? '' : undefined}
            aria-pressed={valgt}
            aria-label={bokstav === '#' ? 'Til toppen' : `Gå til ${bokstav}`}
            tabIndex={tom ? -1 : 0}
            className={`pointer-events-none flex min-h-0 w-full flex-1 items-center justify-center p-0 text-[13px] leading-none ${
              tom
                ? 'font-[500] text-fg-faint'
                : valgt
                  ? 'font-[650] text-fg'
                  : 'font-[500] text-fg-muted'
            }`}
          >
            {bokstav}
          </button>
        );
      })}
    </nav>
  );
}
