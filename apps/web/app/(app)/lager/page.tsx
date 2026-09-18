'use client';

import { TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { LAGER_HUB_LENKER, LAGER_HUB_STATUS } from '../_innbygging/lager-hub';
import { useOrgRole } from '../_lib/use-org-role';
import { shellForBruker } from '../_shell/nav';
import { Beholdning, Feil, Laster, Sidehode, Tomt } from './_delt';

/**
 * Lager-hub. Statusblokk + lenker Deler / Inn- og utlogg.
 * Bestill/minimum bor på /lager/deler. Chrome-piller urørt.
 */
export default function LagerOversiktPage() {
  const { role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  const kunMekaniker =
    shellForBruker({
      role,
      jobFunction: jobbfunksjon,
      isMechanic,
      erPlattform,
    }) === 'mekaniker';
  const oppsummering = trpc.inventory.summary.useQuery();
  const lave = trpc.inventory.listParts.useQuery({
    sorter: 'sku',
    retning: 'asc',
    kunLav: true,
    limit: 100,
  });

  const s = oppsummering.data;
  const verdier: Record<(typeof LAGER_HUB_STATUS)[number], number | undefined> = {
    'På lager': s?.paLager ?? s?.totaltAntall,
    Tilgjengelig: s?.tilgjengelig,
    Reservert: s?.reservert,
    'Under minimum': s?.underMinimum,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <Sidehode
        tittel="Lager"
        undertittel="Deler, beholdning og inn og ut. Kjerne — ikke et tillegg."
      />
      {oppsummering.isError ? (
        <Feil melding={oppsummering.error.message} />
      ) : (
        <div data-lager-hub-status className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LAGER_HUB_STATUS.map((label) => (
            <div
              key={label}
              data-lager-hub-celle={label}
              className="rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none"
            >
              <p className="text-label text-fg-muted">{label}</p>
              <p className="mt-1 font-medium text-[28px] text-fg leading-none tabular-nums">
                {oppsummering.isLoading ? '—' : (verdier[label] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      <nav data-lager-hub-lenker className="flex flex-wrap gap-2">
        {LAGER_HUB_LENKER.map((lenke) => (
          <Link
            key={lenke.href}
            href={lenke.href as Route}
            className="inline-flex h-control items-center rounded-full border border-divide px-3 text-label text-fg"
          >
            {lenke.label}
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Må bestilles</h2>
          {!kunMekaniker ? (
            <Link
              href={'/lager/deler' as Route}
              className="text-[12px] text-fg-muted transition-colors hover:text-fg"
            >
              Se alle deler →
            </Link>
          ) : null}
        </div>

        {lave.isLoading ? (
          <Laster />
        ) : lave.isError ? (
          <Feil melding={lave.error.message} />
        ) : (lave.data?.length ?? 0) === 0 ? (
          <Tomt
            tittel="Ingenting under minimum"
            hint="Deler med et minimumsnivå dukker opp her når de går tomme."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {lave.data?.map((d, i) => (
              <Link
                key={d.id}
                href={`/lager/deler?sok=${encodeURIComponent(d.sku)}` as Route}
                className="group block"
              >
                <div
                  className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0 text-warn" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">{d.name}</span>
                    <span className="truncate font-mono text-[12px] text-fg-muted">{d.sku}</span>
                  </div>
                  <Beholdning tilgjengelig={d.tilgjengelig} reservert={d.reserved} lav />
                  <span className="w-20 shrink-0 text-right text-[12px] text-fg-muted tabular-nums">
                    min. {d.minStock}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
