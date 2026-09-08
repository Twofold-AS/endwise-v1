'use client';

import { BloubBot, type ExpressionId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';
import type { LosTema } from '../_lib/tema';
import { ronnyTemaFarger } from './ronny-farger';
import { IDLE_MS, RONNY_IDLE } from './ronny-idle';

export { lesDomLos, ronnyTemaFarger } from './ronny-farger';
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
 * Kropp/øyne følger `ronnyTemaFarger` — ikke hvit, ikke CSS-filter
 * som jevner øynene bort. `follow={false}` så øynene ikke flyr ut av 28px.
 * To tegninger + `dark:` — SSR/hydrat holder feil JS-tema; CSS velger flaten.
 */
export function RonnyBot({
  size,
  spin = false,
  expression,
  idleSett,
}: {
  size: number;
  paper?: string;
  spin?: boolean;
  expression?: ExpressionId;
  idleSett?: readonly ExpressionId[];
}) {
  const idle = useRonnyIdle(!spin && !expression, idleSett ?? RONNY_IDLE);
  const visUttrykk: ExpressionId = expression ?? (spin ? 'surpris' : idle);
  return (
    <span data-ronny-spin={spin ? '1' : undefined} className="inline-flex">
      <RonnyTegning size={size} los="light" expression={visUttrykk} />
      <RonnyTegning size={size} los="dark" expression={visUttrykk} />
    </span>
  );
}

function RonnyTegning({
  size,
  los,
  expression,
}: {
  size: number;
  los: LosTema;
  expression: ExpressionId;
}) {
  const { kropp, oye } = ronnyTemaFarger(los);
  return (
    <span
      data-ronny-los={los}
      className={los === 'dark' ? 'hidden dark:inline-flex' : 'inline-flex dark:hidden'}
    >
      <BloubBot
        size={size}
        shape="cercle"
        color={kropp}
        paper={oye}
        state="idle"
        expression={expression}
        follow={false}
        still={false}
        playing={false}
      />
    </span>
  );
}
