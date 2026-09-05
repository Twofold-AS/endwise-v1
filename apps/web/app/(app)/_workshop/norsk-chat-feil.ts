/** Ærlig norsk i Ronny-tråden — ikke «Noe gikk galt». Ingen nøkler i teksten. */
export function norskChatFeil(error: { message?: string }): string {
  const m = error.message ?? '';
  if (/function name/i.test(m) && /must be a-z/i.test(m)) {
    return 'Ronny kunne ikke kalle et verktøy (ugyldig navn mot Mistral). Prøv igjen.';
  }
  if (/MISTRAL_API_KEY|MISSING_EU_PROVIDER/.test(m)) {
    return 'Mistral-nøkkelen mangler i miljøet. Agenten kan ikke svare.';
  }
  if (/Ingen modell konfigurert|MODEL_NOT_CONFIGURED|MISTRAL_MODEL_/.test(m)) {
    return /Sett /.test(m) ? m : 'Ingen Mistral-modell er satt for denne rollen.';
  }
  if (/UGYLDIG_TOOL_NAVN|ikke gyldig for Mistral/.test(m)) {
    return m;
  }
  if (/429|rate.?limit|rate_limited|\b1300\b/i.test(m)) {
    return 'Mistral er opptatt (rate limit). Vent et øyeblikk og prøv igjen.';
  }
  if (m && m !== 'An error occurred.' && m !== 'Failed to fetch') return m;
  return 'Ronny fikk ikke svar fra Mistral. Prøv igjen.';
}
