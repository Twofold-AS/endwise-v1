/**
 * Mistral chat/completions krever function-navn i ASCII.
 * Prod 02.09 06:51 UTC: `gåTil` → 400 AI_APICallError
 * («must be a-z, A-Z, 0-9, or contain underscores, dashes, and
 * non consecutive dots»). Norske etiketter og copy kan stå;
 * nøkkelen som går i `tools[]` kan ikke.
 */
export class UgyldigToolNavnError extends Error {
  readonly code = 'UGYLDIG_TOOL_NAVN';
  constructor(navn: string) {
    super(
      `Verktøynavnet «${navn}» er ikke gyldig for Mistral. ` +
        'Bruk kun a–z, A–Z, 0–9, understrek, bindestrek og ikke-påfølgende punktum.',
    );
  }
}

/** Samme regel som Mistral dokumenterer på function name. */
const MISTRAL_TOOL_NAVN = /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;

export function erMistralToolNavn(navn: string): boolean {
  return navn.length > 0 && navn.length <= 256 && MISTRAL_TOOL_NAVN.test(navn);
}

export function assertAsciiToolNames(tools: Record<string, unknown>): void {
  for (const navn of Object.keys(tools)) {
    if (!erMistralToolNavn(navn)) throw new UgyldigToolNavnError(navn);
  }
}
