'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudePageHead } from '../_shell/claude-flate';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { KUNDER_FANER, kunderHref, parseKunderFane } from './_faner';
import { KundeListe } from './_liste';
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

  const kunder = trpc.customers.list.useQuery({
    sok: sok.trim() || undefined,
    sorter: 'navn',
    retning: 'asc',
    kilde: 'alle',
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
          <ClaudePageHead
            title="Kunder"
            sub={`${kunder.data?.length ?? 0} registrerte kunder`}
            primary="Ny"
            primaryHref="/kunder?ny=1"
          />
          <KundeListe
            kunder={kunder.data ?? []}
            laster={kunder.isLoading}
            feil={kunder.error?.message}
            sok={sok}
            onSok={setSok}
          />
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
