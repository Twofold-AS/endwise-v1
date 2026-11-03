'use client';

import { Button, DeaktivertHandling, ListeRad, Package, Seksjon, Side, Store } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { OpprettSkuff } from '../_shell/opprett-skuff';
import { butikkPageSub } from '../lager/_hub';
import { antallIKurv, leggIKurv } from './_kurv';

function kroner(ore: number): string {
  return `${(ore / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}

/**
 * Butikk · Katalog. Leser lager (`parts` + `stock_levels`).
 * Midlertidig blå booking-widget er fjernet (PR #184).
 */
export default function ButikkKatalogPage() {
  const katalog = trpc.shop.catalog.useQuery();
  const [kurvAntall, setKurvAntall] = useState(0);
  const [visAlleVarer, setVisAlleVarer] = useState(false);
  const [nyVare, setNyVare] = useState(false);
  const [nyAnnonse, setNyAnnonse] = useState(false);

  useEffect(() => {
    setKurvAntall(antallIKurv());
  }, []);

  const alleVarer = katalog.data ?? [];
  const varerPreview = visAlleVarer ? alleVarer : alleVarer.slice(0, 3);
  const kjoretoyAntall = 0;

  return (
    <div data-butikk-hub>
      <Side
        className="mx-auto w-full max-w-[1100px] md:px-8 md:py-7"
        tittel="Butikk"
        undertekst={
          katalog.isLoading
            ? 'Aktive deler med utsalgspris. Tilgjengelig = på lager minus reservert.'
            : butikkPageSub(alleVarer.length, kjoretoyAntall)
        }
        handling={<Store size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setNyVare(true)}
            className="inline-flex h-11 items-center rounded-pill border border-fg bg-bg px-4 text-label font-[650] text-fg"
          >
            Ny vare
          </button>
          <Link
            href="/butikk/kasse"
            className="inline-flex h-11 items-center rounded-pill border border-border px-4 text-label text-fg hover:bg-surface-2"
          >
            Handlekurv{kurvAntall > 0 ? ` (${kurvAntall})` : ''}
          </Link>
        </div>
        <OpprettSkuff tittel="Ny vare" apen={nyVare} onLukk={() => setNyVare(false)}>
          <DeaktivertHandling forklaring="Kommer senere">Opprett vare</DeaktivertHandling>
        </OpprettSkuff>

        <Seksjon
          tittel="Varer i nettbutikk"
          handling={
            alleVarer.length > 3 ? (
              <button
                type="button"
                onClick={() => setVisAlleVarer((v) => !v)}
                className="text-body text-fg-muted hover:text-fg"
              >
                {visAlleVarer ? 'Vis færre' : `Se alle varer (${alleVarer.length})`}
              </button>
            ) : null
          }
        >
          <div data-butikk-varer>
            {katalog.isError ? (
              <CardShell className="p-6">
                <p className="text-body text-danger">{katalog.error.message}</p>
              </CardShell>
            ) : katalog.isLoading ? (
              <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
            ) : alleVarer.length === 0 ? (
              <CardShell className="p-10 text-center">
                <p className="text-label text-fg">Ingen deler til salg</p>
                <p className="mt-1 text-body text-fg-muted">
                  Aktive deler trenger utsalgspris for å vises her.
                </p>
              </CardShell>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-border max-md:rounded-[24px] md:rounded-xl">
                <div className="hidden h-9 items-center gap-4 border-border border-b bg-surface-2 px-4 text-meta text-fg-muted md:flex">
                  <span className="w-28 shrink-0">Delenummer</span>
                  <span className="min-w-0 flex-1">Navn</span>
                  <span className="w-28 shrink-0">Kategori</span>
                  <span className="w-24 shrink-0 text-right">Pris</span>
                  <span className="w-24 shrink-0 text-right">Tilgjengelig</span>
                  <span className="w-28 shrink-0" />
                </div>
                {varerPreview.map((d) => (
                  <ListeRad
                    key={d.id}
                    tittel={d.name}
                    undertekst={`${d.sku}${d.category ? ` · ${d.category}` : ''}`}
                    hoyre={
                      <span className="flex items-center gap-2">
                        <span className="text-body tabular-nums">{kroner(d.sellPriceMinor)}</span>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={d.tilgjengelig < 1}
                          onClick={() => {
                            leggIKurv(d.id, d.tilgjengelig);
                            setKurvAntall(antallIKurv());
                          }}
                        >
                          <Package size={14} strokeWidth={1.75} />
                          Legg i kurv
                        </Button>
                      </span>
                    }
                    chevron={false}
                  />
                ))}
              </div>
            )}
          </div>
        </Seksjon>

        <Seksjon
          tittel="Kjøretøy til salgs"
          handling={
            kjoretoyAntall > 0 ? (
              <Link
                href={'/butikk/kjoretoy' as Route}
                className="text-label text-fg-muted hover:text-fg"
              >
                Se alle
              </Link>
            ) : null
          }
        >
          <div data-butikk-kjoretoy>
            <CardShell className="p-6">
              <p className="text-label text-fg">Ingen kjøretøy til salgs</p>
              <p className="mt-1 text-body text-fg-muted">Ingen kjøretøy er lagt ut.</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setNyAnnonse(true)}
                  className="inline-flex h-12 items-center rounded-pill border border-fg bg-bg px-4 text-body font-[650] text-fg"
                >
                  Ny annonse
                </button>
              </div>
              <OpprettSkuff tittel="Ny annonse" apen={nyAnnonse} onLukk={() => setNyAnnonse(false)}>
                <DeaktivertHandling forklaring="Kommer senere">Publiser annonse</DeaktivertHandling>
              </OpprettSkuff>
            </CardShell>
          </div>
        </Seksjon>
      </Side>
    </div>
  );
}
