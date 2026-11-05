'use client';

import {
  Bell,
  IconButton,
  ListeRad,
  SearchField,
  Settings,
  ShoppingCart,
  TomFlate,
} from '@endwise/ui';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { KundeBunnArk } from './ark.tsx';
import { useKundeSok } from './sok.tsx';

export function KundeTopp({
  navn,
  logoUrl,
  farge,
}: {
  navn: string;
  logoUrl: string | null;
  farge?: string;
}) {
  const [ark, setArk] = useState<'varsler' | 'kurv' | 'innstillinger' | null>(null);
  const varsler = trpc.kunde.varsler.useQuery(undefined, { retry: false });
  const meg = trpc.kunde.meg.useQuery(undefined, { retry: false });
  const { sok, setSok } = useKundeSok();
  const liste = varsler.data ?? [];
  const ulest = liste.length;

  async function loggUt() {
    setArk(null);
    await authClient.signOut().catch(() => undefined);
    window.location.assign('/');
  }

  return (
    <>
      <div data-kunde-topp className="flex h-12 w-full items-center justify-between gap-2 px-3">
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
          <IconButton
            icon={Settings}
            aria-label="Innstillinger"
            onClick={() => setArk('innstillinger')}
          />
        </div>
      </div>

      <div data-kunde-sok className="px-3 pt-1 pb-3">
        <SearchField
          aria-label="Søk i kjøretøy"
          placeholder="Søk"
          value={sok}
          onChange={setSok}
          clearLabel="Tøm søk"
        />
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

      <KundeBunnArk
        tittel="Innstillinger"
        apen={ark === 'innstillinger'}
        onLukk={() => setArk(null)}
      >
        <div data-kunde-innstillinger className="flex flex-col gap-4">
          <div className="flex flex-col">
            <p className="truncate text-[16px] font-[650] text-fg">
              {meg.data?.navn?.trim() || '—'}
            </p>
            <p className="truncate text-[13px] text-fg-muted">{meg.data?.epost?.trim() || '—'}</p>
          </div>
          <div className="flex flex-col">
            <ListeRad tittel="Profil" undertekst="Navn og kontaktinfo" href="/profil" />
            <ListeRad tittel="Kjøretøy" undertekst="MC, båt og ATV" href="/kjoretoy" />
            <ListeRad tittel="Mine data" undertekst="Innsyn" href="/mine-data" />
            <ListeRad tittel="Personvern" undertekst="Slik vi behandler data" href="/personvern" />
            <ListeRad tittel="Deler" undertekst="Nettbutikk er satt på vent" href="/deler" />
            <ListeRad tittel="Kvitteringer" undertekst="Ingen kjøp ennå" href="/kvitteringer" />
          </div>
          <button
            type="button"
            data-kunde-logg-ut
            className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-border text-label text-fg"
            onClick={() => void loggUt()}
          >
            Logg ut
          </button>
        </div>
      </KundeBunnArk>
    </>
  );
}
