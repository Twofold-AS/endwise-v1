'use client';

import { Avatar, Car, ChevronRight, Mail, Phone, Plus, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PhoneSokFelt } from '../_shell/phone-sok-felt';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../_shell/sortering-ark';
import { Feil, Kilde, Laster, Tomt } from './_delt';
import { KUNDER_FANER, kunderHref, parseKunderFane } from './_faner';
import { NyKunde } from './_ny-kunde';
import { RegistrerKjoretoy } from './_registrer-kjoretoy';

/**
 * Kunder. Liste med søk og filtrering.
 * Filtreringen bor her, ikke i Settings (prinsippet fra F5-19:
 * konfigurasjon i Settings, filtrering der arbeidet skjer). Søket treffer navn,
 * e-post og telefon — de tre tingene man har for hånden når kunden ringer.
 * Sorteringen er en allowlist server-side (A03); knappene her er bare de samme
 * to verdiene serveren allerede godtar.
 */
const TID_VALG = [
  { key: 'nyeste', label: 'Nyeste', sorter: 'opprettet' as const, retning: 'desc' as const },
  { key: 'eldste', label: 'Eldste', sorter: 'opprettet' as const, retning: 'asc' as const },
] as const;

const KILDER = [
  { key: 'alle', label: 'Alle' },
  { key: 'endwise', label: 'Endwise' },
  { key: 'quick', label: 'Quick' },
] as const;

function KunderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [sok, setSok] = useState(params?.get('sok') ?? '');
  /**
   * Quick action «Ny kunde» peker hit med ?ny=1. Fram til leste
   * ingenting den parameteren — knappen gikk til en side som så uendret ut.
   * Samme feil som /innboks?ny=1 hadde. Se `_ny-kunde.tsx`.
   */
  const aktiv = parseKunderFane('/kunder', params?.get('fane'), params?.get('ny'));
  const nyKunde = aktiv === 'opprett';
  const [tid, setTid] = useState<(typeof TID_VALG)[number]['key']>('nyeste');
  const [kilde, setKilde] = useState<(typeof KILDER)[number]['key']>('alle');
  const [sorterApen, setSorterApen] = useState(false);
  const sorterRef = useRef<HTMLDivElement>(null);
  const tidValg = TID_VALG.find((v) => v.key === tid) ?? TID_VALG[0];

  const kunder = trpc.customers.list.useQuery({
    sok: sok.trim() || undefined,
    sorter: tidValg.sorter,
    retning: tidValg.retning,
    kilde,
    limit: 200,
  });

  return (
    <SideChromeSkall
      tittel="Kunder"
      ingress="Søk, opprett og endre kunder. Quick er fakta når det er koblet på."
      faner={KUNDER_FANER.map((f) => ({ ...f, href: kunderHref(f.id) }))}
      aktiv={aktiv}
    >
      {nyKunde ? <NyKunde onLukk={() => router.replace('/kunder' as Route)} /> : null}
      {aktiv === 'kjoretoy' ? <RegistrerKjoretoy /> : null}
      {aktiv === 'alle' ? (
        <>
          {/* Søk + filtre */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1" data-kunder-sok>
              <PhoneSokFelt
                value={sok}
                onChange={(e) => setSok(e.target.value)}
                placeholder="Søk på navn, e-post eller telefon"
                aria-label="Søk i kunder"
              />
            </div>
            <div ref={sorterRef} className="relative">
              <button
                type="button"
                data-kunder-sortering
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
                <SorteringGruppe tittel="Type">
                  {KILDER.map((v) => (
                    <SorteringValg
                      key={v.key}
                      valgt={kilde === v.key}
                      onVelg={() => {
                        setKilde(v.key);
                        setSorterApen(false);
                      }}
                    >
                      {v.label}
                    </SorteringValg>
                  ))}
                </SorteringGruppe>
                <SorteringGruppe tittel="Tid">
                  {TID_VALG.map((v) => (
                    <SorteringValg
                      key={v.key}
                      valgt={tid === v.key}
                      onVelg={() => {
                        setTid(v.key);
                        setSorterApen(false);
                      }}
                    >
                      {v.label}
                    </SorteringValg>
                  ))}
                </SorteringGruppe>
              </SorteringArk>
            </div>
          </div>

          {kunder.isLoading ? (
            <Laster />
          ) : kunder.isError ? (
            <Feil melding={kunder.error.message} />
          ) : (kunder.data?.length ?? 0) === 0 ? (
            <>
              <Tomt
                tittel={sok ? 'Ingen treff' : 'Ingen kunder ennå'}
                hint={
                  sok
                    ? 'Prøv et annet søk, eller fjern filteret.'
                    : 'Opprett kunden her. Uten Quick lagrer Endwise kunden selv — ingen synk kreves.'
                }
              />
              {!sok && !nyKunde && (
                <div className="-mt-2 flex justify-center">
                  <Link
                    href={'/kunder?ny=1' as Route}
                    className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
                  >
                    <Plus size={14} strokeWidth={1.75} />
                    Ny kunde
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              {kunder.data?.map((k, i) => (
                <Link key={k.id} href={`/kunder/${k.id}` as Route} className="group block">
                  <div
                    className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                      i > 0 ? 'border-border border-t' : ''
                    }`}
                  >
                    {/* Samme seed som kundekortet raden lenker til. */}
                    <Avatar seed={k.id} navn="" size={32} bevegelse="stille" />

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2 truncate text-label text-fg">
                        {k.name}
                        <Kilde source={k.source} />
                      </span>
                      <span className="flex items-center gap-3 truncate text-[12px] text-fg-muted">
                        {k.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} strokeWidth={1.75} />
                            {k.phone}
                          </span>
                        )}
                        {k.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail size={12} strokeWidth={1.75} />
                            {k.email}
                          </span>
                        )}
                        {!k.phone && !k.email && 'Ingen kontaktinfo'}
                      </span>
                    </div>

                    {k.antallKjoretoy > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-fg-muted tabular-nums">
                        <Car size={14} strokeWidth={1.75} />
                        {k.antallKjoretoy}
                      </span>
                    )}
                    <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <Users size={14} />
            {kunder.isLoading
              ? 'Laster kunder …'
              : `${kunder.data?.length ?? 0} kunder vist. Filtrene over gjelder kun denne lista.`}
          </p>
        </>
      ) : null}
    </SideChromeSkall>
  );
}

/** Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster kunder …</div>}>
      <KunderInner />
    </Suspense>
  );
}
