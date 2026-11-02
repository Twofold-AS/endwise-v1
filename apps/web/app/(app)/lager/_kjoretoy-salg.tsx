'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { Tomt } from './_delt';

/**
 * Claude §4.22 — delt salgsflate for Lager og Butikk.
 * Salgskanaler er ikke tilgjengelige ennå.
 */
export function KjoretoyTilSalgsFlate({ tilbake }: { tilbake: string }) {
  return (
    <div data-kjoretoy-salg className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kjøretøy til salgs</h1>
        <p className="text-title text-fg">Kjøretøy til salgs</p>
        <p className="text-body text-fg-muted">Ingen kjøretøy til salgs.</p>
      </div>
      <p className="text-[12px] text-fg-muted">
        Tilbake:{' '}
        <Link href={tilbake as Route} className="underline decoration-border underline-offset-2">
          {tilbake}
        </Link>
      </p>
      <Tomt tittel="Ingen kjøretøy til salgs" hint="Salgskanaler er ikke tilgjengelige ennå." />
    </div>
  );
}
