'use client';

import { trpc } from '@/lib/trpc';
import { BEVEGELSE_LABEL, BEVEGELSE_TONE, Feil, Laster, Sidehode, Tomt } from '../_delt';

/**
 * Lager · Bevegelser. Append-only historikk.
 * Dette er fasiten, ikke en rapport. `stock_levels` er en
 * materialisering man kan bygge opp igjen herfra — ikke omvendt. Derfor kan
 * ingen rad her redigeres: er tallet feil, legger man til en korreksjon. Man
 * retter ikke historien.
 */
export default function BevegelserPage() {
  const bevegelser = trpc.inventory.listMovements.useQuery({ limit: 200 });

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <Sidehode
        tittel="Inn og ut"
        undertittel="Alt som har gått inn og ut. Historikken rettes aldri — den suppleres."
      />

      {bevegelser.isLoading ? (
        <Laster />
      ) : bevegelser.isError ? (
        <Feil melding={bevegelser.error.message} />
      ) : (bevegelser.data?.length ?? 0) === 0 ? (
        <Tomt
          tittel="Ingen bevegelser ennå"
          hint="Registrer et varemottak eller et uttak under Deler."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {bevegelser.data?.map((b, i) => (
            <div
              key={b.id}
              className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span
                className={`inline-flex h-badge w-20 shrink-0 items-center justify-center rounded-badge px-2 font-medium text-[11px] ${
                  BEVEGELSE_TONE[b.kind] ?? 'bg-surface-2 text-fg-muted'
                }`}
              >
                {BEVEGELSE_LABEL[b.kind] ?? b.kind}
              </span>
              <span className="w-12 shrink-0 text-label text-fg tabular-nums">{b.quantity}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label text-fg">{b.partName}</span>
                <span className="truncate text-[12px] text-fg-muted">
                  <span className="font-mono">{b.sku}</span> · {b.locationCode}
                  {b.note ? ` · ${b.note}` : ''}
                </span>
              </div>
              <span className="w-32 shrink-0 text-right text-[12px] text-fg-muted tabular-nums">
                {new Date(b.createdAt).toLocaleString('nb-NO', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
