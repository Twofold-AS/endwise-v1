'use client';

import { Button, Inbox, MessageSquarePlus, Sparkles, TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useEventStream } from '../_lib/use-event-stream';
import { ESCALATION_REASON_LABEL, fmtWhen } from './_lib';
import { NySamtale } from './_ny-samtale';

/**
 * Innholdsflaten når ingen samtale er valgt.
 * Selve trådlista flyttet ut i innboksens egen sidebar
 * (`_inbox-sidebar.tsx`). Det som blir igjen her er det som gjelder hele
 * innboksen: eskaleringene fra AI.
 * Når en agent gir fra seg en samtale, er det den ene tingen på
 * skjermen som haster. Derfor står den her, i det store feltet, og ikke som en
 * rad blant tjue andre rader i sidebaren.
 */
type LiveEscalation = { threadId: string; reason: string; summary: string; at: number };

function MeldingerPageInner() {
  const utils = trpc.useUtils();
  const router = useRouter();
  const params = useSearchParams();
  const [escalations, setEscalations] = useState<LiveEscalation[]>([]);

  // Quick action «Ny melding» peker hit med ?ny=1. Fram til leste
  // ingenting den parameteren — knappen gikk til en side som så uendret ut.
  const nySamtale = params?.get('ny') === '1';

  const onStreamEvent = useCallback(
    (event: { type: string; subjectId: string | null; data: Record<string, unknown> }) => {
      if (event.type === 'message.created') {
        void utils.messages.listThreads.invalidate();
        return;
      }
      if (event.type === 'thread.escalated' && event.subjectId) {
        const threadId = event.subjectId;
        setEscalations((current) => [
          {
            threadId,
            reason: String(event.data.reason ?? 'low_confidence'),
            summary: String(event.data.summary ?? ''),
            at: Date.now(),
          },
          ...current.filter((e) => e.threadId !== threadId),
        ]);
        void utils.messages.listThreads.invalidate();
      }
    },
    [utils],
  );

  // Sanntid kjører fortsatt — men uten statuspille. Eiers beslutning
  // statusmerker («Sanntid», «Live», «Aktive») er pynt som
  // konkurrerer med innholdet. Strømmen skal merkes ved at ting dukker opp,
  // ikke ved en lampe som sier at den kunne dukket opp.
  useEventStream(onStreamEvent);

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      {nySamtale && <NySamtale onLukk={() => router.replace('/innboks' as Route)} />}

      {/* Eskalert fra AI. Live på SSE mens siden er åpen. */}
      {escalations.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-warn/25 bg-warn-soft p-3">
          <h2 className="flex items-center gap-2 text-label text-warn">
            <TriangleAlert size={16} />
            Assistenten ga fra seg {escalations.length}{' '}
            {escalations.length === 1 ? 'samtale' : 'samtaler'}
          </h2>
          {escalations.map((e) => (
            <Link
              key={e.threadId}
              href={`/innboks/${e.threadId}` as Route}
              className="flex min-h-row-store items-center gap-3 rounded-control border border-border bg-bg px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-2"
            >
              <Sparkles size={16} className="shrink-0 text-warn" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label text-fg">
                  {ESCALATION_REASON_LABEL[e.reason] ?? e.reason}
                </span>
                {e.summary && (
                  <span className="line-clamp-2 text-[12px] text-fg-muted">{e.summary}</span>
                )}
              </div>
              <span className="shrink-0 text-[12px] text-fg-muted tabular-nums">
                {fmtWhen(new Date(e.at))}
              </span>
            </Link>
          ))}
          <p className="text-[12px] text-fg-muted">
            Vises live siden du åpnet siden. Overtakelsen skjer i tråden — kunden starter ikke på
            nytt.
          </p>
        </section>
      )}

      {!nySamtale && (
        <div className="flex min-h-[min(520px,70dvh)] flex-col items-center justify-center gap-4 py-16 text-center">
          <Inbox size={56} strokeWidth={1.25} className="text-fg-muted" />
          <p className="text-title text-fg">Ingen valgte meldinger</p>
          <Button asChild>
            <Link href={'/innboks?ny=1' as Route}>
              <MessageSquarePlus size={16} strokeWidth={1.75} />
              Ny chat
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** Suspense-grense er påkrevd: siden leser `useSearchParams` (?ny=1). */
export default function MeldingerPage() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster innboks …</div>}>
      <MeldingerPageInner />
    </Suspense>
  );
}
