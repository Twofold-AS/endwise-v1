/**
 * Én lovlig produkt-From. Klient og env kan ikke bytte den i prod.
 * Verifisert domene: endwise.no. Ikke no-reply@endwise.no, ikke subdomene.
 */

export const RESEND_FROM_KANONISK = 'Endwise <noreply@endwise.no>';

const EPOST_MAX = 254;
const EPOST_LOKAL_MAX = 64;
const EPOST_DOMENE_MAX = 253;

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
  if (trimmet.length === 0 || trimmet.length > EPOST_MAX) return false;
  if (/[\s\r\n,;]/.test(trimmet)) return false;
  const at = trimmet.indexOf('@');
  if (at <= 0 || at !== trimmet.lastIndexOf('@')) return false;
  const lokal = trimmet.slice(0, at);
  const domene = trimmet.slice(at + 1);
  const punkt = domene.lastIndexOf('.');
  if (punkt <= 0 || punkt === domene.length - 1) return false;
  if (lokal.length > EPOST_LOKAL_MAX || domene.length > EPOST_DOMENE_MAX) return false;
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
