'use client';

import { BloubBot, type ExpressionId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';
import { IDLE_MS, RONNY_IDLE } from './ronny-idle';

export { IDLE_MS, RONNY_IDLE, RONNY_PHONE_IDLE } from './ronny-idle';

export function useRonnyIdle(
  aktiv: boolean,
  sett: readonly ExpressionId[] = RONNY_IDLE,
): ExpressionId {
  const [steg, setSteg] = useState(0);
  useEffect(() => {
    if (!aktiv) return;
    const id = window.setInterval(() => {
      setSteg((s) => (s + 1) % sett.length);
    }, IDLE_MS);
    return () => window.clearInterval(id);
  }, [aktiv, sett]);
  return sett[steg % sett.length] ?? sett[0] ?? 'heureux';
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
  idleSett,
}: {
  size: number;
  paper: string;
  spin?: boolean;
  expression?: ExpressionId;
  idleSett?: readonly ExpressionId[];
}) {
  const idle = useRonnyIdle(!spin && !expression, idleSett ?? RONNY_IDLE);
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
