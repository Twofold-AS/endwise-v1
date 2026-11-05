'use client';

import { ArrowUpRight, FilterChips } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { NyKnapp } from '../../_shell/ny-handling';
import { PhoneSokFelt } from '../../_shell/phone-sok-felt';
import { MobilSideBunn } from '../../_shell/pulse-kort';
import { Feil, Laster, Tomt } from '../../kunder/_delt';
import { tjenesterPageSub, trefferTjenesteSok } from '../../prisliste/_hub';
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
  onNy,
}: {
  skjulPiller?: boolean;
  tittel?: string;
  skjulNy?: boolean;
  onNy?: () => void;
}) {
  const { isAdmin } = useOrgRole();
  const [filter, setFilter] = useState<string>('alle');
  const [sok, setSok] = useState('');
  const [nyApen, setNyApen] = useState(false);

  /**
   * `inkluderInaktive` er sann her, og usann alle andre steder.
   * Katalogflaten er det eneste stedet en deaktivert tjeneste skal være synlig
   * ellers finnes det ingen vei til å slå den på igjen. Booking-motoren og
   * /bookinger/ny ber aldri om dem.
   */
  const tjenester = trpc.services.list.useQuery({ inkluderInaktive: true });

  const etterType = (tjenester.data ?? []).filter(
    (t) => filter === 'alle' || t.vehicleType === filter,
  );
  const synlige = etterType.filter((t) => trefferTjenesteSok(t, sok));
  const aktive = synlige.filter((t) => t.active);
  const inaktive = synlige.filter((t) => !t.active);
  const tilbys = etterType.filter((t) => t.active).length;

  return (
    <div
      data-tjenester-liste
      className={
        skjulPiller
          ? 'flex flex-col gap-5'
          : 'mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-title text-fg max-md:text-[24px] max-md:font-[650]">{tittel}</h1>
          <p className="mt-0.5 text-body text-fg-muted">Tjenestene kunden kan bestille hos dere.</p>
        </div>
        {isAdmin && !nyApen && !skjulNy ? (
          <NyKnapp onClick={onNy ?? (() => setNyApen(true))}>Ny tjeneste</NyKnapp>
        ) : null}
      </div>

      <p data-tjenester-pagesub className="text-[12px] text-fg-muted">
        {tjenester.isLoading ? 'Laster tjenester …' : tjenesterPageSub(tilbys)}
      </p>

      <div className="flex flex-col gap-3">
        <div data-tjenester-sok className="min-w-[180px]">
          <PhoneSokFelt
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Søk tjeneste"
            aria-label="Søk tjeneste"
          />
        </div>
        <FilterChips
          chips={FILTRE}
          valgt={filter}
          onChange={setFilter}
          ariaLabel="Filtrer på kjøretøytype"
        />
      </div>

      {isAdmin ? <NyTjeneste apen={nyApen} onLukk={() => setNyApen(false)} /> : null}

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
        Ser du etter hva dere betaler Endwise? Det ligger under «Tillegg og priser»
        <ArrowUpRight size={13} strokeWidth={1.75} />
      </Link>
      <MobilSideBunn />
    </div>
  );
}
