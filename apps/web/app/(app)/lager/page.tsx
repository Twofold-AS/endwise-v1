'use client';

import { ArrowLeftRight, LasterFlate, ListeRad, Package, Seksjon, Side, TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { shellForBruker } from '../_shell/nav';
import { Feil, Laster, Sidehode, Tomt } from './_delt';
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
    <Side
      className="mx-auto w-full max-w-[1000px] md:px-8 md:py-7 [&>header]:md:hidden"
      tittel="Lager"
      undertekst={
        oppsummering.isLoading
          ? 'Deler, beholdning og inn og ut. Kjerne — ikke et tillegg.'
          : lagerPageSub(s?.antallDeler ?? 0)
      }
    >
      <div data-lager-hub className="flex flex-col gap-5">
        <div className="max-md:hidden">
          <Sidehode
            tittel="Lager"
            undertittel={
              oppsummering.isLoading
                ? 'Deler, beholdning og inn og ut. Kjerne — ikke et tillegg.'
                : lagerPageSub(s?.antallDeler ?? 0)
            }
          />
        </div>
        {oppsummering.isError ? (
          <Feil melding={oppsummering.error.message} />
        ) : (
          <div data-lager-stats className="grid grid-cols-2 gap-2">
            <Teller
              icon={TriangleAlert}
              label={LAGER_STAT_LABELS[3]}
              verdi={lave.data?.length}
              laster={lave.isLoading}
            />
            <Teller
              icon={Package}
              label="Tilgjengelig"
              verdi={s?.tilgjengelig}
              laster={oppsummering.isLoading}
            />
          </div>
        )}

        <Seksjon tittel="Lagerstyring">
          <nav data-lager-hub-seksjoner aria-label="Lagerstyring" className="flex flex-col">
            {LAGER_HUB_SEKSJONER.map((sek) => (
              <ListeRad key={sek.id} href={sek.href} tittel={sek.label} undertekst={sek.sub} />
            ))}
          </nav>
        </Seksjon>
      </div>

      {/* Lav beholdning — det eneste på siden som krever handling. */}
      <Seksjon
        tittel="Må bestilles"
        handling={
          !kunMekaniker ? (
            <Link
              href={'/lager/deler' as Route}
              className="text-body text-fg-muted transition-colors hover:text-fg"
            >
              Se alle deler →
            </Link>
          ) : null
        }
      >
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
          (lave.data ?? []).map((d) => (
            <ListeRad
              key={d.id}
              href={`/lager/deler?sok=${encodeURIComponent(d.sku)}`}
              tittel={d.name}
              undertekst={d.sku}
              hoyre={`min. ${d.minStock}`}
            />
          ))
        )}
      </Seksjon>
    </Side>
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
        {laster ? (
          <LasterFlate linjer={1} className="py-0" label="Henter tall" />
        ) : (
          <p className="font-medium text-[28px] text-fg leading-none tabular-nums">{verdi ?? 0}</p>
        )}
        {hint && !laster ? <p className="text-meta text-fg-muted">{hint}</p> : null}
      </div>
    </CardShell>
  );
}
