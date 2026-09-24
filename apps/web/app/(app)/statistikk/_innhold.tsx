'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { tallCeller, tallVindu } from '../_shell/phone-home-pulse';
import { PulseTallKort } from '../_shell/pulse-kort';
import type { StatistikkFaneId } from './_faner';

/**
 * Alle tall — samme Claude 2×2 som hjem. Faner er chrome, innholdet er Tall.
 */
export function StatistikkInnhold({ fane }: { fane: StatistikkFaneId }) {
  const vindu = useMemo(() => tallVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery({
    from: vindu.fra,
    to: vindu.til,
    limit: 200,
  });
  const celler = tallCeller(bookings.data ?? [], new Date());

  const forklaring =
    fane === 'nettside'
      ? 'Sidevisninger er ikke tilkoblet ennå.'
      : fane === 'salg'
        ? 'Salgstall venter på kasse-API.'
        : fane === 'effektivitet'
          ? 'Effektivitet beregnes når nok jobber er fullført.'
          : 'Bookinger siste 30 dager mot forrige 30.';

  return (
    <div data-statistikk-tall className="flex flex-col gap-4">
      <p className="text-[15px] text-fg-muted">{forklaring}</p>
      {bookings.isLoading ? (
        <div className="h-40 animate-pulse rounded-[24px] bg-surface-2" />
      ) : (
        <PulseTallKort celler={celler} href="/statistikk" />
      )}
    </div>
  );
}
