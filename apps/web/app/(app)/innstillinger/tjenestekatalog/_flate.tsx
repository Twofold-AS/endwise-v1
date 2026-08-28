'use client';

import { ArrowUpRight, Plus, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { Feil, Laster, Tomt } from '../../kunder/_delt';
import { TYPE_VALG } from './_felles';
import { NyTjeneste } from './_ny-tjeneste';
import { TjenesteKort } from './_tjeneste-kort';

/**
 * F2-05 / F5-04 — forhandlerens egen tjenestekatalog.
 * Bor som blokk på Organisasjon → Oversikt. Ikke egen pille.
 */
const FILTRE = [{ key: 'alle', label: 'Alle' }, ...TYPE_VALG] as const;

export function PrislisteFlate({ skjulPiller = false }: { skjulPiller?: boolean }) {
  const { isAdmin } = useOrgRole();
  const [filter, setFilter] = useState<string>('alle');
  const [nyApen, setNyApen] = useState(false);

  /**
   * `inkluderInaktive` er sann her, og usann alle andre steder.
   * Katalogflaten er det eneste stedet en deaktivert tjeneste skal være synlig
   * ellers finnes det ingen vei til å slå den på igjen. Booking-motoren og
   * /bookinger/ny ber aldri om dem.
   */
  const tjenester = trpc.services.list.useQuery({ inkluderInaktive: true });

  const synlige = (tjenester.data ?? []).filter(
    (t) => filter === 'alle' || t.vehicleType === filter,
  );
  const aktive = synlige.filter((t) => t.active);
  const inaktive = synlige.filter((t) => !t.active);

  return (
    <div
      className={
        skjulPiller
          ? 'flex flex-col gap-5'
          : 'mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7'
      }
    >
      <div>
        <h1 className="sr-only">Prisliste</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Wrench size={18} strokeWidth={1.75} className="text-fg-muted" />
          Prisliste
        </p>
        <p className="text-body text-fg-muted">
          Tjenestene kunden kan bestille hos dere, med varighet, pris og hvilke ferdigheter jobben
          krever.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Kjøretøytype"
          className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
        >
          {FILTRE.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex h-7 items-center rounded-[7px] px-2.5 text-label transition-colors ${
                filter === f.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {isAdmin && !nyApen && (
          <button
            type="button"
            onClick={() => setNyApen(true)}
            className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
          >
            <Plus size={14} strokeWidth={1.75} />
            Ny tjeneste
          </button>
        )}
      </div>

      {isAdmin && nyApen && <NyTjeneste onLukk={() => setNyApen(false)} />}

      {tjenester.isLoading ? (
        <Laster />
      ) : tjenester.isError ? (
        <Feil melding={tjenester.error.message} />
      ) : synlige.length === 0 ? (
        <Tomt
          tittel={filter === 'alle' ? 'Ingen tjenester ennå' : 'Ingen tjenester for denne typen'}
          hint={
            isAdmin
              ? 'Opprett den første tjenesten — den blir valgbar på nye saker med én gang.'
              : 'En leder må legge inn tjenestene før de kan velges på en sak.'
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {aktive.map((t) => (
              <TjenesteKort key={t.id} tjeneste={t} kanEndre={isAdmin} />
            ))}
          </div>

          {inaktive.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-label text-fg-muted">Deaktiverte ({inaktive.length})</h2>
              <p className="text-[12px] text-fg-muted">
                Kan ikke velges på nye saker. Tidligere bookinger er uendret.
              </p>
              {inaktive.map((t) => (
                <TjenesteKort key={t.id} tjeneste={t} kanEndre={isAdmin} />
              ))}
            </section>
          )}
        </>
      )}

      <Link
        href={'/organisasjon?seksjon=abonnement' as Route}
        className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
      >
        Ser du etter hva dere betaler Endwise? Det ligger under «Tjenester &amp; priser»
        <ArrowUpRight size={13} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
