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
 * (mock/seed) til strøm-klienten wires inn. Farge/tekst står alltid i klartekst
 * ved siden av prikken — pulsen alene bærer ikke informasjon.
 */
export function SseStatusPill({ state = 'live' }: { state?: SseState }) {
  const isLive = state === 'live';
  return (
    <span
      className="inline-flex h-badge items-center gap-1.5 rounded-pill border border-border bg-surface-2 px-2.5 font-medium text-[11px] text-fg-muted"
      title={`Datastrøm: ${LABEL[state]}`}
    >
      <span className="relative flex size-2 items-center justify-center">
        {isLive && (
          <span
            className="absolute inline-flex size-2 animate-ping rounded-full motion-reduce:hidden"
            style={{ background: 'var(--ew-accent-strong)', opacity: 0.7 }}
          />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ background: isLive ? 'var(--ew-accent-strong)' : 'var(--ew-fg-muted)' }}
        />
      </span>
      <Activity size={12} className="text-fg-muted" aria-hidden />
      {LABEL[state]}
    </span>
  );
}
