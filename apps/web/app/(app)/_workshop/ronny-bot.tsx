'use client';

import { BloubBot, type ExpressionId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';

export const IDLE_MS = 5000;

/** Bare ansikt/humør. Ingen tenke-/varsel-state på boten. */
export const RONNY_IDLE: readonly ExpressionId[] = [
  'heureux',
  'colere',
  'surpris',
  'hilare',
  'curieux',
  'attentif',
  'excite',
  'fier',
  'mefiant',
  'colere',
  'heureux',
  'colere',
];

export function useRonnyIdle(aktiv: boolean): ExpressionId {
  const [steg, setSteg] = useState(0);
  useEffect(() => {
    if (!aktiv) return;
    const id = window.setInterval(() => {
      setSteg((s) => (s + 1) % RONNY_IDLE.length);
    }, IDLE_MS);
    return () => window.clearInterval(id);
  }, [aktiv]);
  return RONNY_IDLE[steg] ?? RONNY_IDLE[0];
}

export function useRonnySpinn(): { spin: boolean; trigg: () => void } {
  const [spin, setSpin] = useState(false);
  function trigg() {
    setSpin(true);
    window.setTimeout(() => setSpin(false), 700);
  }
  return { spin, trigg };
}

/**
 * Chrome-Ronny — kun uttrykksbytte (ansikt/humør).
 * `playing={false}`: Bloub defaultCycle er tenke-/varsel-reel.
 * Klikk-spinn er CSS `data-ronny-spin="1"` + surpris.
 */
export function RonnyBot({
  size,
  paper,
  spin = false,
  expression,
}: {
  size: number;
  paper: string;
  spin?: boolean;
  expression?: ExpressionId;
}) {
  const idle = useRonnyIdle(!spin);
  const visUttrykk: ExpressionId = expression ?? (spin ? 'surpris' : idle);
  return (
    <span data-ronny-spin={spin ? '1' : undefined} className="inline-flex">
      <BloubBot
        size={size}
        shape="cercle"
        color="#1d1d1f"
        paper={paper}
        state="idle"
        expression={visUttrykk}
        follow
        still={false}
        playing={false}
      />
    </span>
  );
}
