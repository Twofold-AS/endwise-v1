'use client';

import { Button, ShoppingCart, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ButikkPiller } from '../../_shell/ansatte-piller';
import { CardShell } from '../../_shell/cards';
import { lesKurv, settKurvAntall, tomKurv } from '../_kurv';

function kroner(ore: number): string {
  return `${(ore / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}

function KasseInner() {
  const params = useSearchParams();
  const status = params?.get('butikk') ?? params?.get('betaling') ?? null;
  const katalog = trpc.shop.catalog.useQuery();
  const kasse = trpc.shop.createCheckout.useMutation();
  const [linjer, setLinjer] = useState(lesKurv);

  useEffect(() => {
    if (status === 'ok') tomKurv();
    setLinjer(lesKurv());
  }, [status]);

  const rader = useMemo(() => {
    const perId = new Map((katalog.data ?? []).map((d) => [d.id, d]));
    return linjer
      .map((l) => {
        const del = perId.get(l.partId);
        if (!del) return null;
        return { ...l, del };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [linjer, katalog.data]);

  const sum = rader.reduce((s, r) => s + r.del.sellPriceMinor * r.quantity, 0);

  async function tilKasse() {
    const retur = `${window.location.origin}/butikk`;
    const ut = await kasse.mutateAsync({
      linjer: rader.map((r) => ({ partId: r.partId, quantity: r.quantity })),
      returnUrl: retur,
    });
    if (ut.url) window.location.assign(ut.url);
  }

  if (status === 'ok') {
    return (
      <CardShell className="p-6">
        <p className="text-label text-fg">Betalingen er mottatt</p>
        <p className="mt-1 text-body text-fg-muted">
          Ordren merkes betalt når Stripe bekrefter. Du kan gå tilbake til katalogen.
        </p>
        <Link
          href={'/butikk' as Route}
          className="mt-4 inline-flex h-control items-center text-label text-fg underline-offset-2 hover:underline"
        >
          Til katalogen
        </Link>
      </CardShell>
    );
  }

  return (
    <>
      {status === 'avbrutt' && (
        <CardShell className="p-4">
          <p className="text-body text-fg-muted">Kassen ble avbrutt. Handlekurven er uendret.</p>
        </CardShell>
      )}

      {katalog.isError ? (
        <CardShell className="p-6">
          <p className="text-body text-danger">{katalog.error.message}</p>
        </CardShell>
      ) : katalog.isLoading ? (
        <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
      ) : rader.length === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Handlekurven er tom</p>
          <p className="mt-1 text-[12px] text-fg-muted">Velg deler i katalogen først.</p>
          <Link
            href={'/butikk' as Route}
            className="mt-3 inline-flex h-control items-center text-label text-fg underline-offset-2 hover:underline"
          >
            Til katalogen
          </Link>
        </CardShell>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-border">
            {rader.map((r, i) => (
              <div
                key={r.partId}
                className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <span className="w-28 shrink-0 truncate font-mono text-[12px] text-fg-muted">
                  {r.del.sku}
                </span>
                <span className="min-w-0 flex-1 truncate text-label text-fg">{r.del.name}</span>
                <span className="w-24 shrink-0 text-right text-[12px] text-fg tabular-nums">
                  {kroner(r.del.sellPriceMinor)}
                </span>
                <label className="sr-only" htmlFor={`antall-${r.partId}`}>
                  Antall {r.del.sku}
                </label>
                <input
                  id={`antall-${r.partId}`}
                  type="number"
                  min={1}
                  max={r.del.tilgjengelig}
                  value={r.quantity}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    if (!Number.isFinite(n)) return;
                    setLinjer(
                      settKurvAntall(r.partId, Math.min(r.del.tilgjengelig, Math.max(0, n))),
                    );
                  }}
                  className="h-control w-16 rounded-control border border-border bg-bg px-2 text-right text-body text-fg tabular-nums outline-none focus-visible:border-fg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLinjer(settKurvAntall(r.partId, 0))}
                >
                  Fjern
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-label text-fg">
              Sum {kroner(sum)}
              <span className="ml-2 text-[12px] text-fg-muted font-normal">eks. frakt</span>
            </p>
            <StatefulButton
              state={kasse.isPending ? 'loading' : kasse.isSuccess ? 'success' : 'idle'}
              loadingText="Åpner kasse…"
              successText="Videre"
              onClick={() => void tilKasse()}
              disabled={rader.length === 0 || kasse.isPending}
            >
              Til Stripe-kasse
            </StatefulButton>
          </div>
          {kasse.isError && <p className="text-body text-danger">{kasse.error.message}</p>}
        </div>
      )}
    </>
  );
}

/**
 * Butikk · Handlekurv / kasse. Stripe test-checkout, ikke abonnement.
 * Ingen ny UI-pakke — CardShell + StatefulButton + native number input.
 */
export default function ButikkKassePage() {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Butikk · Handlekurv / kasse</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <ShoppingCart size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Handlekurv / kasse
        </p>
        <p className="text-body text-fg-muted">
          Testkasse hos Stripe. Betalingen går ikke til abonnementet.
        </p>
        <div className="mt-3">
          <ButikkPiller />
        </div>
      </div>
      <Suspense fallback={<p className="py-12 text-center text-body text-fg-muted">Laster …</p>}>
        <KasseInner />
      </Suspense>
    </div>
  );
}
