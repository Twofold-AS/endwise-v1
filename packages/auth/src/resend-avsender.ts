/**
 * Én lovlig produkt-From. Klient og env kan ikke bytte den i prod.
 * Verifisert domene: endwise.no. Ikke no-reply@endwise.no, ikke subdomene.
 */

export const RESEND_FROM_KANONISK = 'Endwise <noreply@endwise.no>';

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function produktAvsender(): string {
  const envFrom = process.env.RESEND_FROM?.trim();
  if (process.env.NODE_ENV === 'production') {
    return RESEND_FROM_KANONISK;
  }
  if (envFrom && envFrom !== RESEND_FROM_KANONISK) {
    throw new Error(`RESEND_FROM må være nøyaktig ${RESEND_FROM_KANONISK}`);
  }
  return RESEND_FROM_KANONISK;
}

export function erEnkelEpost(adresse: string): boolean {
  const trimmet = adresse.trim();
  if (!EPOST.test(trimmet)) return false;
  if (/[\r\n,;]/.test(trimmet)) return false;
  return true;
}

export function stripCrLf(verdi: string): string {
  return verdi.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}

export function krevEnkelEpost(adresse: string, felt: string): string {
  const trimmet = adresse.trim();
  if (!erEnkelEpost(trimmet)) {
    throw new Error(`Ugyldig ${felt}`);
  }
  return trimmet;
}

/** CWE-20 — From må være nøyaktig den kanoniske produktadressen. */
export function avsenderErKanonisk(from: string): boolean {
  return from === RESEND_FROM_KANONISK;
}
