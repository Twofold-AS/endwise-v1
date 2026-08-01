/**
 * F14-04 — [ART50-UI] AI Act art. 50-transparens, SERVER-side kanon.
 *
 * ⚠️ LOVTEKST, ikke pynt (Regulation (EU) 2024/1689, art. 50). Opplysningen om at
 * kunden snakker med en AI MÅ gis ved/ved starten av HVER kunde-AI-samtale. Denne
 * konstanten er sannheten backend HÅNDHEVER: chat-endepunktet returnerer den som
 * det FØRSTE elementet i hvert svar, uavhengig av hva klienten gjør. En tuklet
 * eller egenskrevet widget kan altså ikke fjerne merkingen — serveren sender den.
 *
 * Speiler `AI_DISCLOSURE_TEXT` / `AI_HANDOVER_TEXT` i `@endwise/ui`
 * (`packages/ui/src/compliance/ai-disclosure.tsx`). To kopier fordi @endwise/ui er
 * en React-pakke som ikke skal dras inn i Hono-backend; hold dem i synk ved endring.
 * Søk `[ART50-UI]` i repoet for alle stedene merkingen lever.
 */

export type DisclosureLocale = 'no' | 'en';

/** «Du snakker med en AI»-opplysningen. Vises FØR samtalen starter. */
export const WIDGET_AI_DISCLOSURE: Record<DisclosureLocale, string> = {
  no: 'Du snakker nå med en AI-assistent, ikke et menneske. Du kan når som helst be om å bli satt over til en medarbeider.',
  en: 'You are chatting with an AI assistant, not a human. You can ask to be transferred to a person at any time.',
};

/** Vises når samtalen eskaleres til et menneske. */
export const WIDGET_AI_HANDOVER: Record<DisclosureLocale, string> = {
  no: 'Du blir nå satt over til en medarbeider. Et menneske overtar samtalen.',
  en: 'You are being transferred. A human is taking over the conversation.',
};
