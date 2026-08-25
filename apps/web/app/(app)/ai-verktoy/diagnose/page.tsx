'use client';

import { Sparkles } from '@endwise/ui';
import { AgentChat } from '../../_chat/agent-chat';
import { CardShell } from '../../_shell/cards';

/**
 * F6-04 + F6-18 — AI-DIAGNOSE, den EKTE chat-flaten.
 *
 * ⚠️ Dette er den eneste chat-flaten i produktet som faktisk snakker med en
 * modell. Den går mot `/chat/ai-diagnose` (Next route handler) → agent-runtime.
 * Sammenlign med `/ai-verktoy/nettside`, som er en demo-strøm og sier det.
 *
 * ── Hvorfor akkurat denne agenten først ──────────────────────────────────
 * F6-04 hadde backend fra før (leverandør-abstraksjon, dataklasse-ruting,
 * logging). Det som manglet var en flate der noen faktisk kunne SNAKKE med den
 * — konsollen på `/ai-innsikt` kjører én melding om gangen uten samtale.
 *
 * ── ⛔ Dataklassen bestemmer leverandøren ────────────────────────────────
 * Agenten er `customer_freetext`: den som skriver beskriver et problem med egne
 * ord, og vi vet ikke hva som står der. Derfor **Mistral (EU)**, håndhevet i
 * `streamAgentChat()`. Klienten kan ikke overstyre det.
 */
export default function AiDiagnosePage() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[880px] flex-1 flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Diagnose</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Sparkles size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Diagnose
        </p>
        <p className="text-body text-fg-muted">
          Beskriv problemet med egne ord. Assistenten spør hvis noe er uklart, slår opp hvilke
          tjenester verkstedet tilbyr, og foreslår hvilken som passer.
        </p>
      </div>

      <CardShell className="flex min-h-0 flex-1 flex-col p-5">
        <AgentChat
          agent="ai-diagnose"
          apning="Hei! Beskriv hva som er galt med kjøretøyet, så finner vi ut hvilken tjeneste som passer. Skriv gjerne hva slags kjøretøy det er."
          forslag={[
            'Motorsykkelen starter ikke etter vinteren',
            'Bremsene bak føles myke på ATV-en',
            'Båtmotoren går ujevnt på tomgang',
          ]}
        />
      </CardShell>

      <p className="text-[12px] text-fg-muted leading-relaxed">
        Assistenten gir aldri pris eller ventetid, og vurderer aldri om noe er trygt å kjøre. Er du
        i tvil, sett kjøretøyet og ta kontakt med verkstedet.
      </p>
    </div>
  );
}
