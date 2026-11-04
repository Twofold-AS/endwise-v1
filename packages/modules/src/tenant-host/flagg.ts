/**
 * White label er eneste versjon. Flaggene ENDWISE_WHITE_LABEL og
 * ENDWISE_WHITE_LABEL_SPIKE er fjernet — funksjonen finnes bare så
 * eldre kall kompilerer, og returnerer alltid true.
 */
export function erWhiteLabelAktiv(_env?: Record<string, string | undefined>): boolean {
  return true;
}
