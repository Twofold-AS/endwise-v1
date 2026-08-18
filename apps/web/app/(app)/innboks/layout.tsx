import type { ReactNode } from 'react';
import { DetaljerSlot } from './_detaljer-slot';
import { InboxSidebar } from './_inbox-sidebar';

/**
 * F6-01 / F6-17 — Innboksen har TRE kolonner: samtalelista (hvilken samtale),
 * tråden (selve samtalen) og «Detaljer» (hva samtalen handler om).
 *
 * Layouten holder innboks-sidebaren montert på tvers av trådbytter, så lista
 * ikke blinker hver gang du åpner en samtale. Det samme gjelder detaljpanelet:
 * bytter du tråd, byttes innholdet — ikke hele kolonnen.
 *
 * Headeren i hver kolonne er 56px med `border-b`, samme som topbaren over — de
 * fire skillelinjene (topbar, hoved-sidebar, innboks-sidebar, detaljer) møtes
 * på én linje tvers over skjermen.
 *
 * ⚠️ `DetaljerSlot` tegner ingenting uten en valgt tråd, og under `xl` legger
 * panelet seg som overlay i stedet for å presse meldingsspalten sammen. Tre
 * faste kolonner på en 13-tommer gir ~200px til samtalen, og da er den ikke
 * lesbar lenger. Se `_detaljer.tsx`.
 */
export default function MeldingerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <InboxSidebar />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      <DetaljerSlot />
    </div>
  );
}
