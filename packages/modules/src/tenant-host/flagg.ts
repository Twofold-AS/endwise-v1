/**
 * White label release-flagg. Av som default — dagens endwise.no-brukere
 * ser ingen endring. Skru på lokalt / i test med ENDWISE_WHITE_LABEL=1
 * (eller ENDWISE_WHITE_LABEL_SPIKE=1 fra F0).
 * Dette er et miljøflagg, ikke entitlements-modulen `white-label`.
 */
export function erWhiteLabelSpikeAktiv(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENDWISE_WHITE_LABEL_SPIKE === '1';
}

export function erWhiteLabelAktiv(env: Record<string, string | undefined> = process.env): boolean {
  return env.ENDWISE_WHITE_LABEL === '1' || erWhiteLabelSpikeAktiv(env);
}
