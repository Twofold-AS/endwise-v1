'use client';

import { ArrowUpRight, Plus, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { SorteringArk, SorteringValg } from '../../_shell/sortering-ark';
import { Feil, Laster, Tomt } from '../../kunder/_delt';
import { TYPE_VALG } from './_felles';
import { NyTjeneste } from './_ny-tjeneste';
import { TjenesteKort } from './_tjeneste-kort';

/**
 * F2-05 / F5-04 — forhandlerens egen tjenestekatalog.
 * Destinasjon Salg (`/prisliste`). Samme SoR som widgeten. Ikke Timeplan-popup.
 */
const FILTRE = [{ key: 'alle', label: 'Alle' }, ...TYPE_VALG] as const;

export function PrislisteFlate({
  skjulPiller = false,
  tittel = 'Prisliste',
  skjulNy = false,
}: {
  skjulPiller?: boolean;
  tittel?: string;
  skjulNy?: boolean;
}) {
  const { isAdmin } = useOrgRole();
  const [filter, setFilter] = useState<string>('alle');
  const [nyApen, setNyApen] = useState(false);
  const [sorterApen, setSorterApen] = useState(false);
  const sorterRef = useRef<HTMLDivElement>(null);

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
      {skjulPiller ? null : (
        <div>
          <h1 className="sr-only">{tittel}</h1>
          <p className="flex items-center gap-2 text-title text-fg">
            <Wrench size={18} strokeWidth={1.75} className="text-fg-muted" />
            {tittel}
          </p>
          <p className="text-body text-fg-muted">
            Tjenestene kunden kan bestille hos dere, med varighet, pris og hvilke ferdigheter jobben
            krever.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div ref={sorterRef} className="relative">
          <button
            type="button"
            data-tjenester-sortering
            aria-expanded={sorterApen}
            aria-haspopup="true"
            aria-label="Sortering"
            onClick={() => setSorterApen((v) => !v)}
            className={`shrink-0 border-b-2 pb-1 text-label ${
              sorterApen ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
            }`}
          >
            Sortering
          </button>
          <SorteringArk
            apen={sorterApen}
            onLukk={() => setSorterApen(false)}
            anker={sorterRef.current}
          >
            {FILTRE.map((f) => (
              <SorteringValg
                key={f.key}
                valgt={filter === f.key}
                onVelg={() => {
                  setFilter(f.key);
                  setSorterApen(false);
                }}
              >
                {f.label}
              </SorteringValg>
            ))}
          </SorteringArk>
        </div>

        <div className="flex-1" />

        {isAdmin && !nyApen && !skjulNy && (
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
