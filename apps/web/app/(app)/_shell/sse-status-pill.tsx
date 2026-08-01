'use client';

import { Activity } from '@endwise/ui';

type SseState = 'live' | 'connecting' | 'idle';

const LABEL: Record<SseState, string> = {
  live: 'Sanntid',
  connecting: 'Kobler til…',
  idle: 'Frakoblet',
};

/**
 * SSE-status-pille. Konseptuelt koblet til `apps/stream` (F6-02): når strømmen
 * er oppe, viser pilla «Sanntid» med grønn puls. Her drevet av en `state`-prop
 * (mock/seed) til strøm-klienten wires inn. Farge/tekst står ALLTID i klartekst
 * ved siden av prikken — pulsen alene bærer ikke informasjon.
 */
export function SseStatusPill({ state = 'live' }: { state?: SseState }) {
  const isLive = state === 'live';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface/40 px-2.5 py-1 text-[11px] font-medium text-fg-muted"
      title={`Datastrøm: ${LABEL[state]}`}
    >
      <span className="relative flex size-2 items-center justify-center">
        {isLive && (
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary/70 motion-reduce:hidden" />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ background: isLive ? 'var(--ew-accent)' : 'var(--ew-fg-faint)' }}
        />
      </span>
      <Activity size={12} className="text-fg-faint" aria-hidden />
      {LABEL[state]}
    </span>
  );
}
