'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Feil, kroner, Laster } from '../_delt';
import { belowMin, INGEN_API } from '../_hub';

/**
 * Claude §4.19 del-detalj mot `inventory.part`.
 * Endre minimum = ingen update-API. Bestill mer = stub-rute.
 */
export function DelDetalj({ delId, onBevegelse }: { delId: string; onBevegelse: () => void }) {
  const detalj = trpc.inventory.part.useQuery({ id: delId });

  if (detalj.isLoading) return <Laster />;
  if (detalj.isError) return <Feil melding={detalj.error.message} />;
  const del = detalj.data?.del;
  if (!del) return null;

  const onHand = (detalj.data?.niva ?? []).reduce((s, n) => s + n.onHand, 0);
  const reserved = (detalj.data?.niva ?? []).reduce((s, n) => s + n.reserved, 0);
  const lav = belowMin({ onHand, reserved, minStock: del.minStock, ordered: 0 });

  return (
    <div data-del-detalj className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
      <p className="text-label text-fg">
        {del.name} <span className="font-mono text-[12px] text-fg-muted">{del.sku}</span>
      </p>
      <div>
        <p className="text-fg-faint text-xs">Plassering</p>
        {(detalj.data?.niva ?? []).length === 0 ? (
          <p className="text-[12px] text-fg-muted">Ingen lokasjon ennå.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {detalj.data?.niva.map((n) => (
              <li key={n.locationId} className="text-[12px] text-fg">
                {n.kode} · {n.navn} · {n.tilgjengelig} tilgjengelig
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
        <dt className="text-fg-muted">På lager</dt>
        <dd className="text-right tabular-nums">{onHand}</dd>
        <dt className="text-fg-muted">Reservert</dt>
        <dd className="text-right tabular-nums">{reserved}</dd>
        <dt className="text-fg-muted">Tilgjengelig</dt>
        <dd className={`text-right tabular-nums ${lav ? 'text-danger' : ''}`}>
          {onHand - reserved}
        </dd>
        <dt className="text-fg-muted">Minimum</dt>
        <dd className="text-right tabular-nums">{del.minStock ?? '—'}</dd>
        <dt className="text-fg-muted">Bestilt på vei</dt>
        <dd className="text-right text-fg-muted">0 · {INGEN_API}</dd>
        <dt className="text-fg-muted">Innkjøpspris</dt>
        <dd className="text-right tabular-nums">{kroner(del.costMinor)}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBevegelse}
          className="inline-flex h-control items-center rounded-control border border-border px-3 text-label text-fg hover:bg-surface-2"
        >
          Endre beholdning
        </button>
        <span className="inline-flex h-control items-center text-[12px] text-fg-muted">
          Endre minimum · {INGEN_API}
        </span>
        <Link
          href={'/lager/bestill' as Route}
          className="inline-flex h-control items-center rounded-control px-3 text-label text-fg-muted hover:text-fg"
        >
          Bestill mer
        </Link>
      </div>
    </div>
  );
}
