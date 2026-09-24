'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudeAct, ClaudeListRow, ClaudeTag } from '../_shell/claude-flate';
import { HJEM_PULSE_REFETCH, invalidateHjemPulse } from '../_shell/hjem-pulse-sync';
import { endringerVindu, harForesporNotat } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Forespørsler — `[FORESPØRSEL `-notat.
 */
export function TimeplanForespor() {
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
    (j) => j.status !== 'cancelled' && harForesporNotat(j.notes),
  );

  return (
    <div data-timeplan-forespor className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Forespørsler om tid og endring på jobben. Tom liste er ærlig når ingen er meldt.
      </p>
      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster forespørsler …</p>
      ) : rader.length === 0 ? (
        <p className="py-8 text-center text-label text-fg-muted">Ingen ventende forespørsler.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id} className="flex flex-col gap-2">
              <ClaudeListRow
                href={`/bookinger/${j.id}`}
                title={j.serviceName ?? 'Jobb'}
                sub={j.customerName ?? 'Kunde'}
                right={j.status}
              />
              <div className="flex flex-wrap items-center gap-2 px-1">
                <ClaudeTag tone="info">Forespørsel</ClaudeTag>
                <ClaudeAct
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
