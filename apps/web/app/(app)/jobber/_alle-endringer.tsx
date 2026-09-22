'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  ENDRINGER_MOCK_EKSEMPEL,
  type EndringBehandling,
  endringerFraBookinger,
} from '../_innbygging/endringer';
import { EndringKortRad } from '../_innbygging/endringer-kort';
import { HJEM_PULSE_REFETCH, invalidateHjemPulse } from '../_shell/hjem-pulse-sync';
import { endringerVindu } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Endringer — Godkjenn skriver om bookingen når forslaget er parsebart.
 */
export function TimeplanAlleEndringer() {
  const utils = trpc.useUtils();
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );
  const [behandling, setBehandling] = useState<ReadonlyMap<string, EndringBehandling>>(
    () => new Map(),
  );
  const [logg, setLogg] = useState<string[]>([]);

  const settle = trpc.bookings.settleChange.useMutation({
    onSuccess: (_res, input) => {
      invalidateHjemPulse(utils);
      void bookings.refetch();
      setLogg((forrige) => [
        `${new Date().toLocaleString('nb-NO')} · ${input.decision} · ${input.bookingId.slice(0, 8)}`,
        ...forrige,
      ]);
    },
  });

  const ekte = endringerFraBookinger(bookings.data ?? [], behandling);
  const rader = ekte.length > 0 ? ekte : ENDRINGER_MOCK_EKSEMPEL;

  return (
    <div data-timeplan-endringer-alle className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Godkjenn skriver om bookingen når forslaget har tid eller mekaniker. Mock-rader er merket.
      </p>
      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster endringer …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende endringer.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((k) => (
            <li key={k.id}>
              <EndringKortRad
                kort={{ ...k, behandling: behandling.get(k.id) ?? k.behandling }}
                onBehandle={(id, til) => {
                  setBehandling((forrige) => new Map(forrige).set(id, til));
                  if (k.mock || !k.jobbId) return;
                  settle.mutate({
                    bookingId: k.jobbId,
                    decision: til === 'godkjent' ? 'godkjent' : 'avslatt',
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {settle.isError ? <p className="text-[12px] text-danger">{settle.error.message}</p> : null}
      <section
        data-endringer-logg
        className="rounded-[24px] border border-divide bg-card px-4 py-3"
      >
        <h2 className="text-label font-[650] text-fg">Endringslogg</h2>
        {logg.length === 0 ? (
          <p className="mt-1 text-[12px] text-fg-muted">
            Behandlinger i denne økta vises her. Full historikk ligger på jobbdetaljen.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {logg.map((linje) => (
              <li key={linje} className="text-[12px] text-fg-muted">
                {linje}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
