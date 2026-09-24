'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudeAct, ClaudeListRow, ClaudeTag } from '../_shell/claude-flate';
import { HJEM_PULSE_REFETCH, invalidateHjemPulse } from '../_shell/hjem-pulse-sync';
import { AVVIK_NOTAT_PREFIKS, endringerVindu, harAvvikNotat } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Avvik — ekte `[AVVIK `-notat.
 * Godkjenn/Avslå skriver `[BEHANDLET ` via bookings.resolveChange (F7-05).
 */
export function TimeplanAvvik() {
  const utils = trpc.useUtils();
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );
  const resolve = trpc.bookings.resolveChange.useMutation({
    onSuccess: () => {
      void bookings.refetch();
      invalidateHjemPulse(utils);
    },
  });

  const rader = (bookings.data ?? []).filter(
    (j) => j.status !== 'cancelled' && harAvvikNotat(j.notes),
  );

  return (
    <div data-timeplan-avvik data-timeplan-endringer className="flex flex-col gap-4">
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Avvik mekanikere logger på jobben. Telleren leser ekte{' '}
        <code className="text-fg">{AVVIK_NOTAT_PREFIKS.trim()}</code>-notat. Godkjenn/Avslå skriver
        behandlet-merke på bookingen.
      </p>

      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster avvik …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende avvik.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id} data-endringer-rad={j.id} className="flex flex-col gap-2">
              <ClaudeListRow
                href={`/bookinger/${j.id}`}
                title={j.serviceName ?? 'Jobb'}
                sub={`${j.customerName ?? 'Kunde'}${j.regNumber ? ` · ${j.regNumber}` : ''} · ${j.mechanicName ?? ''}`}
                right={j.status}
              />
              <p className="whitespace-pre-wrap px-1 text-[12px] text-fg-muted">
                {avvikUtdrag(j.notes)}
              </p>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <ClaudeTag tone="warn">Avvik</ClaudeTag>
                <ClaudeAct
                  kind="primary"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ bookingId: j.id, action: 'godkjenn' })}
                >
                  Godkjenn
                </ClaudeAct>
                <ClaudeAct
                  kind="warn"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ bookingId: j.id, action: 'avsla' })}
                >
                  Avslå
                </ClaudeAct>
                <Link
                  href={`/bookinger/${j.id}` as Route}
                  className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
                >
                  Åpne jobb
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function avvikUtdrag(notes: string | null | undefined): string {
  if (!notes) return '';
  const linjer = notes.split('\n').filter((l) => l.includes(AVVIK_NOTAT_PREFIKS));
  return linjer.at(-1) ?? notes;
}
