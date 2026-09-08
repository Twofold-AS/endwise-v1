'use client';

import { ArrowUpRight, CircleQuestionMark, LifeBuoy } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell, CountBadge, NewBadge } from '../_shell/cards';
import { erTestHelpdeskTittel } from '../_shell/helpdesk-slider';
import {
  filtrerHelpdesk,
  HELPDESK_KATEGORI_LABEL,
  HELPDESK_KATEGORIER,
  type HelpdeskKategori,
  helpdeskKategoriLabel,
} from '../support/_kategorier';
import { hjelpHref } from './_faner';

function dato(d: Date | string): string {
  return new Date(d).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function HjelpArtikler({ startKategori }: { startKategori?: string | null }) {
  const artikler = trpc.helpdesk.list.useQuery({ limit: 50 });
  const start = startKategori && startKategori in HELPDESK_KATEGORI_LABEL ? startKategori : 'alle';
  const [kategori, setKategori] = useState<HelpdeskKategori | 'alle'>(
    start as HelpdeskKategori | 'alle',
  );
  const alle = useMemo(
    () => (artikler.data ?? []).filter((a) => !erTestHelpdeskTittel(a.title)),
    [artikler.data],
  );
  const rader = useMemo(() => filtrerHelpdesk(alle, kategori), [alle, kategori]);
  const uleste = rader.filter((a) => a.ulest).length;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={hjelpHref('forespor') as Route}
        data-hjelp-forespor-inngang
        className="flex items-center justify-between gap-3 rounded-[16px] border border-divide bg-card px-4 py-3"
      >
        <span className="text-label text-fg">Forespørsler</span>
        <span className="text-[13px] text-fg-muted">Skriv til Endwise</span>
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="text-title text-fg md:hidden">Artikler</h2>
        <CountBadge count={uleste} label="uleste artikler" />
      </div>

      <div role="tablist" aria-label="Kategori" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          role="tab"
          aria-selected={kategori === 'alle'}
          onClick={() => setKategori('alle')}
          className={`inline-flex h-7 items-center rounded-pill px-3 text-label transition-colors ${
            kategori === 'alle' ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
          }`}
        >
          Alle
        </button>
        {HELPDESK_KATEGORIER.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kategori === k}
            onClick={() => setKategori(k)}
            className={`inline-flex h-7 items-center rounded-pill px-3 text-label transition-colors ${
              kategori === k ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
            }`}
          >
            {HELPDESK_KATEGORI_LABEL[k]}
          </button>
        ))}
      </div>

      {artikler.isLoading ? (
        <p className="py-12 text-center text-body text-fg-muted">Laster artikler …</p>
      ) : rader.length === 0 ? (
        <CardShell className="p-12 text-center">
          <CircleQuestionMark size={24} className="mx-auto text-fg-muted" />
          <p className="mt-2 text-label text-fg">
            {alle.length === 0 ? 'Ingen hjelpeartikler ennå' : 'Ingen artikler i denne kategorien'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-fg-muted leading-relaxed">
            {alle.length === 0
              ? 'Endwise skriver artiklene. Kommer det noe nytt, dukker det opp her og i sidebaren.'
              : 'Prøv en annen kategori, eller velg Alle.'}
          </p>
        </CardShell>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rader.map((a) => (
            <Link key={a.id} href={`/support/${a.slug}` as Route} className="group block">
              <CardShell className="h-full transition-colors group-hover:border-border-strong">
                {a.image && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="text-[11px] text-fg-muted">
                    {helpdeskKategoriLabel(a.category)}
                  </span>
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 text-label text-fg">{a.title}</span>
                    {a.ulest && <NewBadge />}
                  </span>
                  <span className="line-clamp-3 text-[12px] text-fg-muted leading-relaxed">
                    {a.summary}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-1.5 text-[11px] text-fg-muted">
                    {dato(a.publishedAt)}
                    <ArrowUpRight
                      size={13}
                      strokeWidth={1.75}
                      className="ml-auto transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </CardShell>
            </Link>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <LifeBuoy size={14} />
        Trenger du et menneske? Åpne <b>Forespørsler</b> eller skriv i <b>Innboks › Endwise</b>.
      </p>
    </div>
  );
}
