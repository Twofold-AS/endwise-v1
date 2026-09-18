'use client';

import { Button, Package, Store } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { butikkPageSub, hubForhandsvisning, visSeAlle } from '../_innbygging/butikk-hub';
import { ButikkKjoretoySalg } from '../_innbygging/butikk-kjoretoy';
import { PageSub } from '../_innbygging/page-sub';
import { CardShell } from '../_shell/cards';
import { ButikkBookingWidget } from './_booking-widget';
import { antallIKurv, leggIKurv } from './_kurv';

function kroner(ore: number): string {
  return `${(ore / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}

function ButikkHubInner() {
  const params = useSearchParams();
  const se = params?.get('se');
  const katalog = trpc.shop.catalog.useQuery();
  const kjoretoy = trpc.vehicles.list.useQuery({ limit: 50 });
  const [kurvAntall, setKurvAntall] = useState(0);

  useEffect(() => {
    setKurvAntall(antallIKurv());
  }, []);

  const varer = katalog.data ?? [];
  const biler = kjoretoy.data ?? [];
  const visVarer = se === 'varer';
  const visKjoretoy = se === 'kjoretoy';
  const hub = !visVarer && !visKjoretoy;
  const varerVist = hub ? hubForhandsvisning(varer) : varer;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Butikk</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Store size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Butikk
        </p>
        <PageSub>{butikkPageSub(varer.length, biler.length)}</PageSub>
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

      {visVarer ? null : (
        <ButikkKjoretoySalg
          kjoretoy={hub ? hubForhandsvisning(biler) : biler}
          seAlle={
            hub && visSeAlle(biler.length) ? (
              <Link
                href={'/butikk?se=kjoretoy' as Route}
                data-butikk-se-alle="kjoretoy"
                className="text-[12px] text-fg underline-offset-2 hover:underline"
              >
                Se alle
              </Link>
            ) : null
          }
        />
      )}

      {visKjoretoy ? null : (
        <section data-butikk-katalog className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-title text-fg">Varer</h2>
              <p className="text-[12px] text-fg-muted">Aktive deler med utsalgspris.</p>
            </div>
            {hub && visSeAlle(varer.length) ? (
              <Link
                href={'/butikk?se=varer' as Route}
                data-butikk-se-alle="varer"
                className="text-[12px] text-fg underline-offset-2 hover:underline"
              >
                Se alle
              </Link>
            ) : null}
          </div>
          {katalog.isError ? (
            <CardShell className="p-6">
              <p className="text-body text-danger">{katalog.error.message}</p>
            </CardShell>
          ) : katalog.isLoading ? (
            <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
          ) : varer.length === 0 ? (
            <CardShell className="p-10 text-center">
              <p className="text-label text-fg">Ingen deler til salg</p>
              <p className="mt-1 text-[12px] text-fg-muted">
                Aktive deler trenger utsalgspris for å vises her.
              </p>
            </CardShell>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              {varerVist.map((d, i) => (
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
                  <span className="w-24 shrink-0 text-right text-[12px] text-fg tabular-nums">
                    {kroner(d.sellPriceMinor)}
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
      )}
    </div>
  );
}

export default function ButikkKatalogPage() {
  return (
    <Suspense fallback={<p className="px-8 py-7 text-body text-fg-muted">Laster butikk …</p>}>
      <ButikkHubInner />
    </Suspense>
  );
}
