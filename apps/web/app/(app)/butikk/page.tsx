'use client';

import { Button, Package, Store } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { butikkPageSub, INGEN_API } from '../lager/_hub';
import { ButikkBookingWidget } from './_booking-widget';
import { antallIKurv, leggIKurv } from './_kurv';

function kroner(ore: number): string {
  return `${(ore / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}

/**
 * Butikk · Katalog. Leser lager (`parts` + `stock_levels`).
 * Ingen annen katalog. Ingen ny UI-pakke — CardShell + Button + radmønster.
 * Midlertidig: eksisterende EndwiseWidget (F4-03) for å teste booking.
 */
export default function ButikkKatalogPage() {
  const katalog = trpc.shop.catalog.useQuery();
  const [kurvAntall, setKurvAntall] = useState(0);
  const [visAlleVarer, setVisAlleVarer] = useState(false);

  useEffect(() => {
    setKurvAntall(antallIKurv());
  }, []);

  const alleVarer = katalog.data ?? [];
  const varerPreview = visAlleVarer ? alleVarer : alleVarer.slice(0, 3);
  const kjoretoyAntall = 0;

  return (
    <div data-butikk-hub className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Butikk · Katalog</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Store size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Butikk
        </p>
        <p className="text-body text-fg-muted">
          {katalog.isLoading
            ? 'Aktive deler med utsalgspris. Tilgjengelig = på lager minus reservert.'
            : butikkPageSub(alleVarer.length, kjoretoyAntall)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-fg-muted">Ny vare · {INGEN_API}</p>
        <button
          type="button"
          disabled
          className="inline-flex h-control items-center rounded-control border border-border px-3 text-label text-fg-muted"
        >
          Ny
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-fg-muted">Intern testbutikk. Stripe testmodus.</p>
        <Link
          href="/butikk/kasse"
          className="inline-flex h-control items-center rounded-control border border-border px-3 text-label text-fg hover:bg-surface-2"
        >
          Handlekurv / kasse{kurvAntall > 0 ? ` (${kurvAntall})` : ''}
        </Link>
      </div>

      <ButikkBookingWidget />

      <section data-butikk-varer>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Varer i nettbutikk</h2>
          {alleVarer.length > 3 ? (
            <button
              type="button"
              onClick={() => setVisAlleVarer((v) => !v)}
              className="text-[12px] text-fg-muted hover:text-fg"
            >
              {visAlleVarer ? 'Vis færre' : `Se alle varer (${alleVarer.length})`}
            </button>
          ) : null}
        </div>
        {katalog.isError ? (
          <CardShell className="p-6">
            <p className="text-body text-danger">{katalog.error.message}</p>
          </CardShell>
        ) : katalog.isLoading ? (
          <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
        ) : alleVarer.length === 0 ? (
          <CardShell className="p-10 text-center">
            <p className="text-label text-fg">Ingen deler til salg</p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Aktive deler trenger utsalgspris for å vises her.
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex h-9 items-center gap-4 border-border border-b bg-surface-2 px-4 text-[12px] text-fg-muted">
              <span className="w-28 shrink-0">Delenummer</span>
              <span className="min-w-0 flex-1">Navn</span>
              <span className="w-28 shrink-0">Kategori</span>
              <span className="w-24 shrink-0 text-right">Pris</span>
              <span className="w-24 shrink-0 text-right">Tilgjengelig</span>
              <span className="w-28 shrink-0" />
            </div>
            {varerPreview.map((d, i) => (
              <div
                key={d.id}
                className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <span className="w-28 shrink-0 truncate font-mono text-[12px] text-fg-muted">
                  {d.sku}
                </span>
                <span className="min-w-0 flex-1 truncate text-label text-fg">{d.name}</span>
                <span className="w-28 shrink-0 truncate text-[12px] text-fg-muted">
                  {d.category ?? '—'}
                </span>
                <span className="w-24 shrink-0 text-right text-[12px] text-fg tabular-nums">
                  {kroner(d.sellPriceMinor)}
                </span>
                <span className="w-24 shrink-0 text-right text-label text-fg tabular-nums">
                  {d.tilgjengelig}
                </span>
                <span className="flex w-28 shrink-0 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={d.tilgjengelig < 1}
                    onClick={() => {
                      leggIKurv(d.id, d.tilgjengelig);
                      setKurvAntall(antallIKurv());
                    }}
                  >
                    <Package size={14} strokeWidth={1.75} />
                    Legg i kurv
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section data-butikk-kjoretoy>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Kjøretøy til salgs</h2>
          <Link
            href={'/butikk/kjoretoy' as Route}
            className="text-[12px] text-fg-muted hover:text-fg"
          >
            Se alle kjøretøy ({kjoretoyAntall})
          </Link>
        </div>
        <CardShell className="p-6">
          <p className="text-label text-fg">Ingen kjøretøy til salgs</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Listing-API finnes ikke. Vi viser ikke seed-katalog.
          </p>
        </CardShell>
      </section>
    </div>
  );
}
