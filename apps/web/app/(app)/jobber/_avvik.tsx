'use client';

import { CircleAlert } from '@endwise/ui';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  ENDRINGER_MOCK_EKSEMPEL,
  type EndringBehandling,
  endringerFraBookinger,
} from '../_innbygging/endringer';
import { EndringKortRad } from '../_innbygging/endringer-kort';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { AVVIK_NOTAT_PREFIKS, endringerVindu } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Avvik — kort med type · meldt av · jobb · forslag · Godkjenn/Avslå.
 */
export function TimeplanAvvik() {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );
  const [behandling, setBehandling] = useState<ReadonlyMap<string, EndringBehandling>>(
    () => new Map(),
  );

  const ekte = endringerFraBookinger(bookings.data ?? [], behandling).filter(
    (k) => k.type === 'avvik',
  );
  const rader = ekte.length > 0 ? ekte : ENDRINGER_MOCK_EKSEMPEL.filter((k) => k.type === 'avvik');

  return (
    <div data-timeplan-avvik data-timeplan-endringer className="flex flex-col gap-4">
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Avvik fra mekaniker. Telleren leser ekte{' '}
        <code className="text-fg">{AVVIK_NOTAT_PREFIKS.trim()}</code>-notat. Tom liste viser merket
        mock så forhåndsvisningen er klikkbar.
      </p>

      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster avvik …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende avvik.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((k) => (
            <li key={k.id}>
              <EndringKortRad
                kort={{ ...k, behandling: behandling.get(k.id) ?? k.behandling }}
                onBehandle={(id, til) => {
                  setBehandling((forrige) => new Map(forrige).set(id, til));
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 text-[12px] text-fg-muted">
        <CircleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        Godkjenn/Avslå er lokal i denne økta til F7-05 skriver tilbake.
      </p>
    </div>
  );
}
