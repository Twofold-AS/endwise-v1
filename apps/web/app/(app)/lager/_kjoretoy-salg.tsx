'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { Tomt } from './_delt';
import { INGEN_API, SALG_KANALER } from './_hub';

/**
 * Claude §4.22 — delt salgsflate for Lager og Butikk.
 * Ingen listing-/Finn-API: kanaler er merker, ikke live integrasjoner.
 */
export function KjoretoyTilSalgsFlate({ tilbake }: { tilbake: string }) {
  return (
    <div data-kjoretoy-salg className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kjøretøy til salgs</h1>
        <p className="text-title text-fg">Kjøretøy til salgs</p>
        <p className="text-body text-fg-muted">Ingen salgs- eller annonse-API ennå.</p>
      </div>
      <p className="text-[12px] text-fg-muted">
        Tilbake:{' '}
        <Link href={tilbake as Route} className="underline decoration-border underline-offset-2">
          {tilbake}
        </Link>
      </p>
      <div data-salg-kanaler className="flex flex-wrap gap-1.5">
        {SALG_KANALER.map((k) => (
          <span
            key={k}
            className="inline-flex h-7 items-center rounded-full bg-surface-2 px-2.5 text-[12px] text-fg-muted"
          >
            {k} · {INGEN_API}
          </span>
        ))}
      </div>
      <Tomt
        tittel="Ingen kjøretøy til salgs"
        hint="Vi viser ikke seed-katalog. Når et listing-API finnes, lander det her."
      />
    </div>
  );
}
