/**
 * F0-spike. Av som default — dagens endwise.no-brukere ser ingen endring.
 * Skru på lokalt / i test med ENDWISE_WHITE_LABEL_SPIKE=1.
 * Dette er et release-flagg i miljøet, ikke en entitlement (white-label-modulen).
 */
export function erWhiteLabelSpikeAktiv(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENDWISE_WHITE_LABEL_SPIKE === '1';
}
