'use client';

import {
  BoardChip,
  DeaktivertHandling,
  FeltInput,
  FeltTall,
  FeltTekst,
  FilterChips,
  Side,
  TomFlate,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { SALG_KANALER } from './_hub';

const KANALER = SALG_KANALER.map((k) => ({ key: k, label: k }));

/**
 * Claude §4.22 — delt salgsflate for Lager og Butikk.
 * Annonse-skjemaet er bygget; lagring er deaktivert.
 */
export function KjoretoyTilSalgsFlate({ tilbake }: { tilbake: string }) {
  const [kanal, setKanal] = useState<(typeof SALG_KANALER)[number]>('Finn.no');

  return (
    <div data-kjoretoy-salg className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 max-md:px-4 max-md:py-4 md:px-8 md:py-7">
      <Side tittel="Kjøretøy til salgs" undertekst="Ingen kjøretøy til salgs.">
        <p className="text-[12px] text-fg-muted">
          Tilbake:{' '}
          <Link href={tilbake as Route} className="underline decoration-border underline-offset-2">
            {tilbake}
          </Link>
        </p>
        <TomFlate tittel="Ingen kjøretøy til salgs" hint="Ingen annonser er lagt ut." />

        <div className="flex flex-wrap gap-1.5">
          {SALG_KANALER.map((k) => (
            <BoardChip key={k} variant="caption" color="soft">
              {k}
            </BoardChip>
          ))}
        </div>

        <form
          data-kjoretoy-salg-skjema
          className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <p className="text-label text-fg">Ny annonse</p>
          <FilterChips
            chips={KANALER}
            valgt={kanal}
            onChange={(k) => setKanal(k as (typeof SALG_KANALER)[number])}
            ariaLabel="Kanal"
          />
          <FeltInput label="Tittel" placeholder="Merke og modell" />
          <FeltTall label="Pris (kr)" minValue={0} />
          <FeltTall label="Kjørt (km)" minValue={0} />
          <FeltTekst label="Beskrivelse" rows={3} />
          <DeaktivertHandling forklaring="Kommer senere" variant="default">
            Publiser
          </DeaktivertHandling>
        </form>
      </Side>
    </div>
  );
}
