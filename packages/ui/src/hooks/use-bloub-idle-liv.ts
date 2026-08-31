'use client';

import { useEffect, useState } from 'react';
import { BLOUB_HVILE } from '../lib/bloub-hvile.ts';
import type { ExpressionId } from '../vendor/bloub/expressions.ts';

const SKIFT: readonly ExpressionId[] = ['colere', 'curieux', 'attentif', 'mefiant'];

/**
 * Sakte idle-liv. Hvert 5–9. sekund et kort skift, så tilbake til store øyne.
 * Brukes på workshop-bloub og stor profil. Ikke på lister.
 */
export function useBloubIdleLiv(aktiv: boolean): ExpressionId {
  const [uttrykk, setUttrykk] = useState<ExpressionId>(BLOUB_HVILE);

  useEffect(() => {
    if (!aktiv) {
      setUttrykk(BLOUB_HVILE);
      return;
    }
    let pause: number;
    let tilbake: number;
    const planlegg = () => {
      pause = window.setTimeout(
        () => {
          const neste = SKIFT[Math.floor(Math.random() * SKIFT.length)] ?? 'attentif';
          setUttrykk(neste);
          tilbake = window.setTimeout(() => {
            setUttrykk(BLOUB_HVILE);
            planlegg();
          }, 1400);
        },
        5000 + Math.random() * 4000,
      );
    };
    planlegg();
    return () => {
      window.clearTimeout(pause);
      window.clearTimeout(tilbake);
    };
  }, [aktiv]);

  return uttrykk;
}
