import { stripCrLf } from '../resend-avsender.ts';

export const RESEND_ADRESSE_KANONISK = 'noreply@endwise.no';

const FORBUDTE_MERKER = [
  'endwise',
  'vipps',
  'bankid',
  'posten',
  'nav',
  'skatteetaten',
  'dnb',
  'sparebank',
] as const;

export type EpostMerke = {
  navn: string;
  adresse?: string | null;
  telefon?: string | null;
  orgnr?: string | null;
  aksentfarge?: string | null;
  levertAv: boolean;
};

export type EpostAvsender = {
  visningsnavn: string;
  replyTo?: string;
};

export function harLinjeskift(verdi: string): boolean {
  return /[\r\n\u2028\u2029]/.test(verdi);
}

export function rensVisningsnavn(verdi: string): string {
  return stripCrLf(verdi).replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function validerVisningsnavn(verdi: string): string {
  if (harLinjeskift(verdi)) {
    throw new Error('Navn kan ikke ha linjeskift.');
  }
  const renset = rensVisningsnavn(verdi);
  if (renset.length < 2) {
    throw new Error('Navn er for kort.');
  }
  const lav = renset.toLowerCase();
  if (FORBUDTE_MERKER.some((m) => lav === m || lav.startsWith(`${m} `))) {
    throw new Error('Det navnet må godkjennes av oss først.');
  }
  return renset;
}

export function formaterAvsenderFrom(visningsnavn: string): string {
  const navn = validerVisningsnavn(visningsnavn);
  return `${navn} <${RESEND_ADRESSE_KANONISK}>`;
}

export function avsenderAdresseErKanonisk(from: string): boolean {
  const m = from.match(/<([^>]+)>$/);
  const adr = (m?.[1] ?? from).trim().toLowerCase();
  return adr === RESEND_ADRESSE_KANONISK;
}

export const ENDWISE_MERKE: EpostMerke = {
  navn: 'Endwise',
  levertAv: false,
};
