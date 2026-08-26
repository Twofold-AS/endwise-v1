import type { ReactNode } from 'react';
import { InboxChrome } from './_chrome';

/**
 * F6-01 / F6-17 — Innboksen har tre kolonner: samtalelista (hvilken samtale),
 * tråden (selve samtalen) og «Detaljer» (hva samtalen handler om).
 * Layouten holder innboks-sidebaren montert på tvers av trådbytter, så lista
 * ikke blinker hver gang du åpner en samtale. Det samme gjelder detaljpanelet:
 * bytter du tråd, byttes innholdet — ikke hele kolonnen.
 * Headeren i hver kolonne er 56px med `border-b`, samme som topbaren over — de
 * fire skillelinjene (topbar, hoved-sidebar, innboks-sidebar, detaljer) møtes
 * på én linje tvers over skjermen.
 * `DetaljerSlot` tegner ingenting uten en valgt tråd, og under `xl` legger
 * panelet seg som overlay i stedet for å presse meldingsspalten sammen. Tre
 * faste kolonner på en 13-tommer gir ~200px til samtalen, og da er den ikke
 * lesbar lenger. Se `_detaljer.tsx`.
 */
export default function MeldingerLayout({ children }: { children: ReactNode }) {
  return <InboxChrome modus="forhandler">{children}</InboxChrome>;
}
