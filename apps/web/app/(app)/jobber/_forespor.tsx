'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  ENDRINGER_MOCK_EKSEMPEL,
  type EndringBehandling,
  endringerFraBookinger,
} from '../_innbygging/endringer';
import { EndringKortRad } from '../_innbygging/endringer-kort';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { endringerVindu } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Forespørsler — Utvidet tid · Bytte mekaniker · Flytte jobb.
 */
export function TimeplanForespor() {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );
  const [behandling, setBehandling] = useState<ReadonlyMap<string, EndringBehandling>>(
    () => new Map(),
  );

  const ekte = endringerFraBookinger(bookings.data ?? [], behandling).filter(
    (k) => k.type !== 'avvik',
  );
  const rader = ekte.length > 0 ? ekte : ENDRINGER_MOCK_EKSEMPEL.filter((k) => k.type !== 'avvik');

  return (
    <div data-timeplan-forespor className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Forespørsler om tid, bytte og flytting. Tom liste viser merket mock.
      </p>
      {rader.length === 0 ? (
        <p className="py-8 text-center text-label text-fg-muted">Ingen ventende forespørsler.</p>
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
    </div>
  );
}
