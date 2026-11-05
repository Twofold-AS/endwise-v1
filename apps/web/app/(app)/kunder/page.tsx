'use client';

import { LasterFlate, ListeRad, Plus, Side, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { NyKnapp, useNyHandling } from '../_shell/ny-handling';
import { PhoneSokFelt } from '../_shell/phone-sok-felt';
import { MobilSideBunn } from '../_shell/pulse-kort';
import { RadMedMeny, RadMeny } from '../_shell/rad-meny';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../_shell/sortering-ark';
import { KunderAlfaListe } from './_alfa-liste';
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
  const ny = useNyHandling();
  const nyKunde = aktiv === 'opprett' || ny.apen;
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

  const liste = kunder.data ?? [];

  return (
    <SideChromeSkall
      tittel="Kunder"
      ingress="Søk, opprett og endre kunder. Quick er fakta når det er koblet på."
      faner={KUNDER_FANER.map((f) => ({ ...f, href: kunderHref(f.id) }))}
      aktiv={aktiv}
    >
      <NyKunde
        apen={nyKunde}
        onLukk={() => {
          ny.lukk();
          router.replace('/kunder' as Route);
        }}
      />
      {aktiv === 'kjoretoy' ? (
        <RegistrerKjoretoy autoApen onFerdig={() => router.replace('/kunder' as Route)} />
      ) : null}
      {aktiv === 'alle' || nyKunde ? (
        <Side
          tittel="Kunder"
          undertekst={kunder.isLoading ? undefined : `${liste.length} registrerte kunder`}
          handling={<NyKnapp onClick={ny.apne}>Ny kunde</NyKnapp>}
          className="max-md:px-0"
        >
          <div
            data-kunder-flate
            className="flex min-h-[calc(100dvh-11rem)] flex-col gap-3 md:min-h-[calc(100dvh-14rem)]"
          >
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <div className="min-w-[220px] flex-1" data-kunder-sok>
                <PhoneSokFelt
                  value={sok}
                  onChange={(e) => setSok(e.target.value)}
                  placeholder="Søk etter kunde"
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
                  anker={sorterRef}
                >
                  <SorteringGruppe>
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
                  <SorteringGruppe>
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
            ) : (
              <KunderAlfaListe
                kunder={liste}
                tom={
                  <>
                    <Tomt
                      tittel={sok ? 'Ingen kunder matcher søket.' : 'Ingen kunder ennå'}
                      hint={
                        sok
                          ? 'Prøv et annet søk.'
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
                }
                renderRad={(k) => (
                  <div key={k.id} data-kunder-rad>
                    <RadMedMeny
                      meny={
                        <RadMeny
                          label={k.name}
                          handlinger={[
                            {
                              id: 'apne',
                              label: 'Åpne',
                              onSelect: () => router.push(`/kunder/${k.id}` as Route),
                            },
                            {
                              id: 'jobb',
                              label: 'Ny jobb',
                              onSelect: () => router.push(`/bookinger/ny?kunde=${k.id}` as Route),
                            },
                            {
                              id: 'slett',
                              label: 'Slett',
                              disabled: true,
                              forklaring: 'Kommer senere',
                            },
                          ]}
                        />
                      }
                    >
                      <ListeRad
                        href={`/kunder/${k.id}`}
                        tittel={k.name}
                        undertekst={
                          k.phone || k.email
                            ? [k.phone, k.email].filter(Boolean).join(' · ')
                            : 'Ingen kontaktinfo'
                        }
                        initialer={k.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((d) => d[0])
                          .join('')
                          .toLocaleUpperCase('nb-NO')}
                        hoyre={
                          k.antallKjoretoy > 0 ? `${k.antallKjoretoy}` : <Kilde source={k.source} />
                        }
                      />
                    </RadMedMeny>
                  </div>
                )}
              />
            )}

            <p className="flex shrink-0 items-center gap-1.5 text-meta text-fg-muted">
              <Users size={14} />
              {kunder.isLoading ? 'Henter kunder' : `${liste.length} kunder`}
            </p>
            <MobilSideBunn />
          </div>
        </Side>
      ) : null}
    </SideChromeSkall>
  );
}

/** Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<LasterFlate label="Henter kunder" />}>
      <KunderInner />
    </Suspense>
  );
}
