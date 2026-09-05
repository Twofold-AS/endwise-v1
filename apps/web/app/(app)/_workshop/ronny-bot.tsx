'use client';

import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';

export const IDLE_MS = 5000;

/** Bare ansikt/humør. Ingen thinking/alert/notify. */
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
 * Levende Ronny — kun uttrykksbytte (ansikt/humør).
 * Klikk-spinn er rotateY + surpris. Ingen thinking/alert/notify.
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
  const visState: StateId = 'idle';
  return (
    <span
      data-ronny-spin
      className="inline-flex"
      style={{
        transform: spin ? 'rotateY(360deg)' : 'rotateY(0deg)',
        transition: 'transform 600ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <BloubBot
        size={size}
        shape="cercle"
        color="#1d1d1f"
        paper={paper}
        state={visState}
        expression={visUttrykk}
        follow
        still={false}
        playing
      />
    </span>
  );
}
