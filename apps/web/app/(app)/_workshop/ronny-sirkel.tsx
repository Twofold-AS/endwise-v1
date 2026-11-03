'use client';

import { useEffect } from 'react';
import { RonnyBot } from './ronny-bot';
import { useRonnySheet } from './ronny-sheet-state';

/** Større farget sticky sirkel — R3-oransje, uten spin, uten skygge. */
export const RONNY_SIRKEL_KLASSE =
  'fixed top-[55%] left-2 z-[55] flex size-16 items-center justify-center rounded-full bg-[#c45c26] text-bg shadow-none md:hidden';

/**
 * Mobil-inngang til Ronny. Sitter i en reservert venstregutter
 * (`data-ronny-sirkel-plass` på scroll) så den ikke dekker innhold.
 * Ingen rotasjon ved klikk.
 */
export function RonnySirkel() {
  const { apen, apne } = useRonnySheet();

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('[data-ronny-side-scroll]');
    if (!scroller) return;
    const el: HTMLElement = scroller;
    const mobil = window.matchMedia('(max-width: 767px)');
    function sett() {
      if (mobil.matches && !apen) {
        el.setAttribute('data-ronny-sirkel-plass', '');
        el.style.paddingLeft = '6rem';
      } else {
        el.removeAttribute('data-ronny-sirkel-plass');
        el.style.paddingLeft = '';
      }
    }
    sett();
    mobil.addEventListener('change', sett);
    return () => {
      mobil.removeEventListener('change', sett);
      el.removeAttribute('data-ronny-sirkel-plass');
      el.style.paddingLeft = '';
    };
  }, [apen]);

  if (apen) return null;
  return <RonnySirkelKnapp onClick={apne} />;
}

export function RonnySirkelKnapp({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-ronny-sirkel
      aria-label="Åpne Ronny"
      onClick={onClick}
      className={className ?? RONNY_SIRKEL_KLASSE}
    >
      <RonnyBot size={48} expression="heureux" />
    </button>
  );
}
