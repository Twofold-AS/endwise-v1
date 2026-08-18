'use client';

import { PanelRightOpen } from '@endwise/ui';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DetaljerPanel } from './_detaljer';

/**
 * F6-17 — Plassen «Detaljer»-panelet bor på, og bryteren som styrer det.
 *
 * ── Hvorfor åpne/lukke-tilstanden bor HER ─────────────────────────────────
 * Både panelet og knappen som åpner det trenger den. Lå den i trådvisningen,
 * måtte den løftes gjennom en context bare for å nå to søsken. Slot-en er den
 * felles forelderen som allerede finnes.
 *
 * ── Tilstanden lagres per BRUKER, ikke i localStorage ─────────────────────
 * `user_preferences.inbox_details_open` (F5-19-tabellen). Det er en arbeidsvane,
 * ikke en nettleserinnstilling: åpner du innboksen på verkstedets maskin i dag
 * og din egen i morgen, skal panelet stå som du forlot det.
 *
 * ⚠️ Optimistisk lokalt: bryteren flytter panelet MED ÉN GANG og lagrer i
 * bakgrunnen. Å vente på en rundtur før en kolonne forsvinner ville føltes som
 * treghet, og det er ingenting å angre på om lagringen feiler.
 *
 * ── ⛔ Panelet vises KUN når en samtale er valgt ─────────────────────────
 * `/innboks` uten tråd har ingen kontekst å vise — der ville panelet vært en
 * tom kolonne som stjeler bredde fra lista.
 */
export function DetaljerSlot() {
  const params = useParams<{ id?: string }>();
  const threadId = params?.id;

  const meg = trpc.profile.meg.useQuery(undefined, { retry: false });
  const lagre = trpc.profile.setInboxDetails.useMutation();

  // `null` = vi vet ikke ennå. Da tegnes ingenting, slik at panelet ikke
  // rekker å blafre inn og ut mens preferansen lastes.
  const [apen, setApen] = useState<boolean | null>(null);
  useEffect(() => {
    if (meg.data) setApen(meg.data.detaljpanel);
  }, [meg.data]);

  function sett(neste: boolean) {
    setApen(neste);
    lagre.mutate({ apen: neste });
  }

  if (!threadId || apen === null) return null;

  if (!apen) {
    /**
     * Lukket: en smal skinne med åpne-knappen, på linje med de tre andre
     * sidebar-headerne. Ikke en flytende knapp over innholdet — en kontroll som
     * ligger der kolonnen pleide å være, er lettere å finne igjen enn en som
     * svever et sted man ikke assosierer med panelet.
     */
    return (
      <div className="flex w-11 shrink-0 flex-col border-border border-l bg-sidebar">
        <div className="flex h-14 shrink-0 items-center justify-center border-border border-b">
          <button
            type="button"
            onClick={() => sett(true)}
            title="Vis detaljer om samtalen"
            aria-label="Vis detaljer om samtalen"
            aria-expanded={false}
            className="flex size-7 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active/60 hover:text-fg"
          >
            <PanelRightOpen size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  return <DetaljerPanel threadId={threadId} apen onLukk={() => sett(false)} />;
}
