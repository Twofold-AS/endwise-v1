'use client';

import { ArrowLeftRight, MapPin, Package, TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { shellForBruker } from '../_shell/nav';
import { Beholdning, Feil, Laster, Sidehode, Tomt } from './_delt';

/**
 * Lager · Oversikt. Alt her er ekte data fra `inventory`-ruteren.
 * Fire tellere, og «Tilgjengelig» er den som betyr noe: en reservert del står
 * på hylla, men er lovet bort. Så «Lav beholdning» rett under — det eneste på
 * siden som krever en handling.
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

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <Sidehode
        tittel="Lager"
        undertittel="Deler, beholdning og inn og ut. Kjerne — ikke et tillegg."
      />
      {oppsummering.isError ? (
        <Feil melding={oppsummering.error.message} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Teller
            icon={Package}
            label="Deler"
            verdi={s?.antallDeler}
            laster={oppsummering.isLoading}
          />
          <Teller
            icon={Package}
            label="Tilgjengelig"
            verdi={s?.tilgjengelig}
            laster={oppsummering.isLoading}
            hint="På lager minus reservert"
          />
          <Teller
            icon={ArrowLeftRight}
            label="Reservert"
            verdi={s?.reservert}
            laster={oppsummering.isLoading}
            hint="Står fysisk, men er lovet bort"
          />
          <Teller
            icon={MapPin}
            label="Plass"
            verdi={s?.antallLokasjoner}
            laster={oppsummering.isLoading}
          />
        </div>
      )}

      {/* Lav beholdning — det eneste på siden som krever handling. */}
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

function Teller({
  icon: Icon,
  label,
  verdi,
  laster,
  hint,
}: {
  icon: typeof Package;
  label: string;
  verdi: number | undefined;
  laster: boolean;
  hint?: string;
}) {
  return (
    <CardShell>
      <div className="flex flex-col gap-2 p-3">
        <p className="flex items-center gap-2 text-label text-fg-muted">
          <Icon size={16} strokeWidth={1.75} className="shrink-0" />
          {label}
        </p>
        <p className="font-medium text-[28px] text-fg leading-none tabular-nums">
          {laster ? '—' : (verdi ?? 0)}
        </p>
        {hint && <p className="text-[12px] text-fg-muted">{hint}</p>}
      </div>
    </CardShell>
  );
}
