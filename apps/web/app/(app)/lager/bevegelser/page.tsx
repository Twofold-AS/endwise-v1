'use client';

import { BoardChip, FeilFlate, LasterFlate, ListeRad, Side, TomFlate } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { BEVEGELSE_LABEL } from '../_delt';

/**
 * Lager · Bevegelser. Append-only historikk.
 */
export default function BevegelserPage() {
  const bevegelser = trpc.inventory.listMovements.useQuery({ limit: 200 });

  return (
    <div data-lager-logg className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 max-md:px-0 md:px-8 md:py-7">
      <Side
        tittel="Inn og ut"
        undertekst="Siste bevegelser. Historikken rettes aldri — den suppleres."
        tilbakeHref="/lager"
      >
        {bevegelser.isLoading ? (
          <LasterFlate linjer={4} label="Henter bevegelser" />
        ) : bevegelser.isError ? (
          <FeilFlate melding={bevegelser.error.message} />
        ) : (bevegelser.data?.length ?? 0) === 0 ? (
          <TomFlate
            tittel="Ingen bevegelser ennå"
            hint="Ingen inn- eller uttak er registrert."
          />
        ) : (
          (bevegelser.data ?? []).map((b) => (
            <ListeRad
              key={b.id}
              tittel={b.partName}
              undertekst={`${b.sku} · ${b.locationCode}${b.note ? ` · ${b.note}` : ''}`}
              hoyre={
                <span className="flex flex-col items-end gap-1">
                  <BoardChip variant="caption" color={b.kind === 'out' ? 'rose' : 'soft'}>
                    {BEVEGELSE_LABEL[b.kind] ?? b.kind} {b.quantity}
                  </BoardChip>
                  <span className="text-meta text-fg-muted tabular-nums">
                    {new Date(b.createdAt).toLocaleString('nb-NO', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              }
              chevron={false}
            />
          ))
        )}
      </Side>
    </div>
  );
}
