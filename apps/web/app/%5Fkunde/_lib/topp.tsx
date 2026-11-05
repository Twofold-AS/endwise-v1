'use client';

import { Bell, IconButton, ListeRad, ShoppingCart, TomFlate } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { KundeBunnArk } from './ark.tsx';

export function KundeTopp({
  navn,
  logoUrl,
  farge,
}: {
  navn: string;
  logoUrl: string | null;
  farge?: string;
}) {
  const [ark, setArk] = useState<'varsler' | 'kurv' | null>(null);
  const varsler = trpc.kunde.varsler.useQuery(undefined, { retry: false });
  const liste = varsler.data ?? [];
  const ulest = liste.length;

  return (
    <>
      <div data-kunde-topp className="flex h-row w-full items-center justify-between gap-2 px-3">
        <a href="/" className="flex min-w-0 items-center gap-2" aria-label={navn}>
          {logoUrl ? (
            // biome-ignore lint/performance/noImgElement: Blob-URL per forhandler, ukjent host
            <img
              src={logoUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[14px] font-[650] text-fg"
            >
              {(navn.trim().slice(0, 1) || '·').toUpperCase()}
            </span>
          )}
          <p
            className="min-w-0 truncate text-title text-fg max-md:text-[18px] max-md:font-[650]"
            style={farge ? { color: farge } : undefined}
          >
            {navn}
          </p>
        </a>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="relative">
            <IconButton
              icon={Bell}
              aria-label={ulest > 0 ? `Varsler, ${ulest} uleste` : 'Varsler'}
              onClick={() => setArk('varsler')}
            />
            {ulest > 0 ? (
              <span
                data-kunde-ulest
                aria-hidden
                className="absolute top-0.5 right-0.5 size-2 rounded-full bg-fg"
              />
            ) : null}
          </span>
          <IconButton icon={ShoppingCart} aria-label="Handlekurv" onClick={() => setArk('kurv')} />
        </div>
      </div>

      <KundeBunnArk tittel="Varsler" apen={ark === 'varsler'} onLukk={() => setArk(null)}>
        <div data-kunde-varsler className="flex flex-col">
          {liste.length === 0 ? (
            <TomFlate
              tittel="Ingen varsler"
              hint="Påminnelser og beskjeder fra verkstedet vises her."
            />
          ) : (
            liste.map((v) => (
              <ListeRad key={v.id} tittel={v.tittel} undertekst={v.tekst} href={v.href} />
            ))
          )}
        </div>
      </KundeBunnArk>

      <KundeBunnArk tittel="Handlekurv" apen={ark === 'kurv'} onLukk={() => setArk(null)}>
        <div data-kunde-kurv>
          <TomFlate
            tittel="Handlekurven er tom"
            hint="Nettbutikk er satt på vent. Du kan ikke handle deler her ennå."
          />
        </div>
      </KundeBunnArk>
    </>
  );
}
