'use client';

import { ArrowLeftRight, Package, TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { shellForBruker } from '../_shell/nav';
import { Beholdning, Feil, Laster, Sidehode, Tomt } from './_delt';
import { LAGER_HUB_SEKSJONER, LAGER_STAT_LABELS, lagerPageSub } from './_hub';

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
      <div data-lager-hub className="flex flex-col gap-5">
        <Sidehode
          tittel="Lager"
          undertittel={
            oppsummering.isLoading
              ? 'Deler, beholdning og inn og ut. Kjerne — ikke et tillegg.'
              : lagerPageSub(s?.antallDeler ?? 0)
          }
        />
        {oppsummering.isError ? (
          <Feil melding={oppsummering.error.message} />
        ) : (
          <div data-lager-stats className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Teller
              icon={Package}
              label={LAGER_STAT_LABELS[0]}
              verdi={s?.totaltAntall}
              laster={oppsummering.isLoading}
              hint="Fysisk på hylle"
            />
            <Teller
              icon={Package}
              label={LAGER_STAT_LABELS[1]}
              verdi={s?.tilgjengelig}
              laster={oppsummering.isLoading}
              hint="På lager minus reservert"
            />
            <Teller
              icon={ArrowLeftRight}
              label={LAGER_STAT_LABELS[2]}
              verdi={s?.reservert}
              laster={oppsummering.isLoading}
              hint="Står fysisk, men er lovet bort"
            />
            <Teller
              icon={TriangleAlert}
              label={LAGER_STAT_LABELS[3]}
              verdi={lave.data?.length}
              laster={lave.isLoading}
              hint={s ? `${s.antallLokasjoner} plasseringer` : undefined}
            />
          </div>
        )}

        <nav
          data-lager-hub-seksjoner
          aria-label="Lagerstyring"
          className="flex flex-col overflow-hidden rounded-xl border border-border"
        >
          {LAGER_HUB_SEKSJONER.map((sek, i) => (
            <Link
              key={sek.id}
              href={sek.href as Route}
              className={`flex items-center justify-between gap-3 bg-bg px-4 py-3 hover:bg-surface-2 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="text-label text-fg">{sek.label}</span>
              <span className="text-[12px] text-fg-muted">{sek.sub}</span>
            </Link>
          ))}
        </nav>
      </div>

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
