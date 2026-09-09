'use client';

import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';
import type { LosTema } from '../_lib/tema';
import { ronnyTemaFarger } from './ronny-farger';
import { erRonnyWink, IDLE_MS, RONNY_IDLE, type RonnyAnsikt } from './ronny-idle';

export { lesDomLos, ronnyTemaFarger } from './ronny-farger';
export type { RonnyAnsikt } from './ronny-idle';
export { IDLE_MS, RONNY_IDLE, RONNY_PHONE_IDLE } from './ronny-idle';

export function useRonnyIdle(
  aktiv: boolean,
  sett: readonly RonnyAnsikt[] = RONNY_IDLE,
): RonnyAnsikt {
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
 * wink = StateId (ett øye) + heureux, ikke thinking-reel.
 */
export function RonnyBot({
  size,
  spin = false,
  expression,
  ansikt,
  idleSett,
}: {
  size: number;
  paper?: string;
  spin?: boolean;
  expression?: ExpressionId;
  /** Fast ansikt inkludert wink (ett øye). */
  ansikt?: RonnyAnsikt;
  idleSett?: readonly RonnyAnsikt[];
}) {
  const idle = useRonnyIdle(!spin && !expression && !ansikt, idleSett ?? RONNY_IDLE);
  const visAnsikt: RonnyAnsikt = ansikt ?? expression ?? (spin ? 'surpris' : idle);
  return (
    <span data-ronny-spin={spin ? '1' : undefined} className="inline-flex">
      <RonnyTegning size={size} los="light" ansikt={visAnsikt} />
      <RonnyTegning size={size} los="dark" ansikt={visAnsikt} />
    </span>
  );
}

function RonnyTegning({ size, los, ansikt }: { size: number; los: LosTema; ansikt: RonnyAnsikt }) {
  const { kropp, oye } = ronnyTemaFarger(los);
  const wink = erRonnyWink(ansikt);
  const state: StateId = wink ? 'wink' : 'idle';
  /** wink = ett åpent øye (normal størrelse) + ett lukket. Ikke heureux-pliss. */
  const expression: ExpressionId = wink ? 'neutre' : ansikt;
  return (
    <span data-ronny-los={los} data-ronny-ansikt={ansikt} className="inline-flex">
      <BloubBot
        size={size}
        shape="cercle"
        color={kropp}
        paper={oye}
        state={state}
        expression={expression}
        follow={false}
        still={false}
        playing={false}
      />
    </span>
  );
}
