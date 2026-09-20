'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PhoneSokFelt } from '../_shell/phone-sok-felt';
import { Feil, Laster } from '../kunder/_delt';
import { AngreToast } from './angre-toast';
import {
  KUNDE_ALFA,
  KUNDE_SIDE_STORRELSE,
  type KundeAlfaBokstav,
  kundeInitialer,
  kunderAngreTekst,
  kunderPagerTekst,
  kunderPageSub,
  kunderTomTekst,
  lesKundeAngre,
  toemKundeAngre,
} from './kunder-katalog';
import { PageSub } from './page-sub';

/**
 * Claude Kunder-liste. Alfaindeks er HØYRE side-rail inne i liste-viewport
 * (absolute top/right/bottom, 26px). Aldri horisontal wrap under søk.
 */
export function KunderListe() {
  const utils = trpc.useUtils();
  const [sok, setSok] = useState('');
  const [side, setSide] = useState(0);
  const [bokstav, setBokstav] = useState<KundeAlfaBokstav | null>(null);
  const [angre, setAngre] = useState(() => lesKundeAngre());
  const offset = side * KUNDE_SIDE_STORRELSE;
  const q = sok.trim() || undefined;

  const kunder = trpc.customers.list.useQuery({
    sok: q,
    bokstav: bokstav ?? undefined,
    sorter: 'navn',
    retning: 'asc',
    kilde: 'alle',
    limit: KUNDE_SIDE_STORRELSE,
    offset,
  });
  const antall = trpc.customers.antall.useQuery({
    sok: q,
    kilde: 'alle',
    bokstav: bokstav ?? undefined,
  });
  const restore = trpc.customers.restore.useMutation({
    onSuccess: () => {
      toemKundeAngre();
      setAngre(null);
      void utils.customers.list.invalidate();
      void utils.customers.antall.invalidate();
    },
  });

  const total = antall.data ?? 0;
  const rader = kunder.data ?? [];
  const tom = !kunder.isLoading && !kunder.isError && rader.length === 0;

  return (
    <div data-kunder-liste className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <PageSub>{kunderPageSub(total)}</PageSub>
        <Link
          href={'/kunder?fane=opprett' as Route}
          className="inline-flex h-control items-center rounded-full bg-fg px-3 text-label text-bg"
        >
          Ny
        </Link>
      </div>

      <div data-kunder-sok>
        <PhoneSokFelt
          value={sok}
          onChange={(e) => {
            setSok(e.target.value);
            setSide(0);
          }}
          placeholder="Navn, telefon, e-post eller reg.nr"
          aria-label="Søk i kunder"
        />
      </div>

      <div data-kunder-viewport className="relative min-h-[540px] overflow-hidden">
        <div data-kunder-liste-innhold className="pr-[30px]">
          {kunder.isLoading ? (
            <Laster />
          ) : kunder.isError ? (
            <Feil melding={kunder.error.message} />
          ) : tom ? (
            <p data-kunder-tom className="py-10 text-center text-label text-fg-muted">
              {kunderTomTekst(Boolean(q) || Boolean(bokstav))}
            </p>
          ) : (
            <div data-kunder-kortliste className="flex flex-col">
              {rader.map((k) => (
                <Link
                  key={k.id}
                  href={`/kunder/${k.id}` as Route}
                  data-kunde-rad={k.id}
                  className="flex min-h-row-store items-center gap-3 border-divide border-b py-2"
                >
                  <span
                    data-kunde-initialer
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-[650] text-fg"
                  >
                    {kundeInitialer(k.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label text-fg">{k.name}</span>
                    <span className="block truncate text-[12px] text-fg-muted tabular-nums">
                      {k.phone || '—'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p data-kunder-pager className="mt-3 text-[12px] text-fg-muted">
            {kunderPagerTekst(offset, rader.length, total)}
          </p>
          {total > KUNDE_SIDE_STORRELSE ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={side === 0}
                onClick={() => setSide((v) => Math.max(0, v - 1))}
                className="text-label text-fg disabled:text-fg-muted"
              >
                Forrige
              </button>
              <button
                type="button"
                disabled={offset + rader.length >= total}
                onClick={() => setSide((v) => v + 1)}
                className="text-label text-fg disabled:text-fg-muted"
              >
                Neste
              </button>
            </div>
          ) : null}
        </div>

        <nav
          data-kunde-alfa
          aria-label="Alfabet"
          className="absolute top-0 right-1 bottom-0 z-[3] flex w-[26px] flex-col items-center justify-center gap-[3px]"
        >
          {KUNDE_ALFA.map((tegn) => {
            const valgt = bokstav === tegn;
            return (
              <button
                key={tegn}
                type="button"
                data-kunde-alfa-tegn={tegn}
                aria-pressed={valgt}
                onClick={() => {
                  setBokstav((forrige) => (forrige === tegn ? null : tegn));
                  setSide(0);
                }}
                className={`flex h-[15px] w-5 items-center justify-center border-0 bg-transparent p-0 font-sans text-[11px] leading-none ${
                  valgt ? 'font-bold text-fg' : 'font-medium text-fg-muted'
                }`}
              >
                {tegn}
              </button>
            );
          })}
        </nav>
      </div>

      {angre ? (
        <AngreToast
          tekst={kunderAngreTekst(angre.name)}
          onAngre={() =>
            restore.mutate({
              id: angre.id,
              name: angre.name,
              email: angre.email || undefined,
              phone: angre.phone && angre.phone.length >= 3 ? angre.phone : undefined,
              source: angre.source || undefined,
            })
          }
          onLukk={() => {
            toemKundeAngre();
            setAngre(null);
          }}
        />
      ) : null}
    </div>
  );
}
