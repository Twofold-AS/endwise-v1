'use client';

import { CircleAlert, Globe } from '@endwise/ui';
import { createChat } from '@shadcn/helpers/ai-sdk';
import { useMemo } from 'react';
import { AgentChat } from '../../_chat/agent-chat';
import { CardShell } from '../../_shell/cards';

/**
 * AI-VERKTØY › NETTSIDE — flaten finnes, agenten gjør ikke.
 *
 * ── ⚠️ Hva som er ekte her, og hva som ikke er det ───────────────────────
 * **Ingenting under snakker med en modell.** Samtalen er skrevet i koden rett
 * nedenfor og spilles av lokalt gjennom `createChat()` fra
 * `@shadcn/helpers/ai-sdk`. Ingen nettverkskall, ingen lagring, ingen
 * handlinger utført.
 *
 * ── Hvorfor da bygge den ─────────────────────────────────────────────────
 * Framer-agenten (F8-09) er PLANLAGT, ikke bygget — den venter på Framers
 * Server API og en Scaleway-container (F13-04). Fram til da er valget mellom en
 * tom side og en ramme som viser hva flaten skal bli. Vi har valgt rammen, med
 * ett hardt krav: **den skal ikke kunne forveksles med noe som virker.**
 * Derfor `demo`-flagget på `AgentChat`, som tegner en advarsel over samtalen,
 * og derfor gjentar teksten under det samme.
 *
 * ⛔ Den forhåndsskrevne samtalen viser med vilje **godkjenn-steget** før
 * publisering. Det er ikke pynt: det er mønsteret vi har forpliktet oss til i
 * F8-09, og det skal være synlig fra første skisse, ikke lagt til på slutten.
 *
 * ⚠️ Når agenten faktisk bygges: bytt `transport`/`startMeldinger` mot
 * `agent="framer-nettside"` og fjern `demo`. Resten av flaten står.
 */
export default function AiNettsidePage() {
  // `useMemo` fordi `createChat()` bygger en transport med intern tilstand.
  // Ny instans på hver render ville nullstilt samtalen ved hvert tastetrykk.
  const demo = useMemo(
    () =>
      createChat()
        .user('Kan du oppdatere åpningstidene på forsiden? Vi har stengt lørdager fra september.')
        .assistant(
          'Jeg fant seksjonen «Åpningstider» på forsiden. Slik ser den ut i dag:\n\n' +
            'Man–fre 08–16, lør 10–14.\n\n' +
            'Jeg foreslår å endre lørdagsraden til «Stengt» og legge til at endringen gjelder fra 1. september. Vil du at jeg forbereder endringen?',
        )
        .user('Ja, gjør det.')
        .assistant(
          'Endringen er klar som utkast. Den er IKKE publisert — du ser diffen og godkjenner selv før noe går ut på nettsiden.',
        ),
    [],
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[880px] flex-1 flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Nettside</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Globe size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Nettside
        </p>
        <p className="text-body text-fg-muted">
          Endre verkstedets egen nettside ved å beskrive endringen. Agenten foreslår, du godkjenner,
          og først da publiseres noe.
        </p>
      </div>

      <CardShell className="flex items-start gap-3 p-5">
        <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warn" />
        <div className="flex flex-col gap-1">
          <p className="text-label text-fg">Ikke i drift — dette er et eksempel</p>
          <p className="text-body text-fg-muted leading-relaxed">
            Samtalen under er skrevet på forhånd og spilles av lokalt, så du kan se hvordan flaten
            skal fungere. Agenten er planlagt (F8-09) og venter på Framers Server API. Ingenting du
            skriver her sendes noe sted, og ingen nettside endres.
          </p>
        </div>
      </CardShell>

      <CardShell className="flex min-h-0 flex-1 flex-col p-5">
        <AgentChat
          demo
          agent="framer-nettside"
          apning="Beskriv endringen du vil gjøre på nettsiden, så foreslår jeg hvordan den kan se ut."
          transport={demo.transport()}
          startMeldinger={demo.get(0)}
        />
      </CardShell>
    </div>
  );
}
