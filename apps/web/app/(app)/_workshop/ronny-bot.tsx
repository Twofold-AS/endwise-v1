'use client';

import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';

export const IDLE_MS = 5000;

export const RONNY_IDLE: readonly { expression: ExpressionId; state: StateId }[] = [
  { expression: 'heureux', state: 'wink' },
  { expression: 'colere', state: 'burst' },
  { expression: 'surpris', state: 'wide' },
  { expression: 'hilare', state: 'orbit' },
  { expression: 'curieux', state: 'wink' },
  { expression: 'attentif', state: 'idle' },
  { expression: 'excite', state: 'burst' },
  { expression: 'fier', state: 'wink' },
  { expression: 'mefiant', state: 'swirl' },
  { expression: 'colere', state: 'wink' },
  { expression: 'heureux', state: 'burst' },
  { expression: 'colere', state: 'orbit' },
];

export function useRonnyIdle(aktiv: boolean): (typeof RONNY_IDLE)[number] {
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
 * Levende Ronny — eksisterende BloubBot + idle-syklus.
 * Klikk-spinn (rotateY) og thinking ved chat. Ingen nytt karaktersystem.
 */
export function RonnyBot({
  size,
  paper,
  opptatt = false,
  spin = false,
  state,
  expression,
}: {
  size: number;
  paper: string;
  opptatt?: boolean;
  spin?: boolean;
  state?: StateId;
  expression?: ExpressionId;
}) {
  const idle = useRonnyIdle(!opptatt && !spin);
  const visState: StateId = state ?? (opptatt ? 'thinking' : spin ? 'burst' : idle.state);
  const visUttrykk: ExpressionId = expression ?? (spin ? 'surpris' : idle.expression);
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
        follow={!opptatt}
        still={false}
        playing
      />
    </span>
  );
}
