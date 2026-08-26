/**
 * Helpdesk-kategorier. Speiler `@endwise/db` (HELPDESK_KATEGORIER).
 * Web importerer ikke `@endwise/db`. Testen `helpdesk-kategorier.test.ts`
 * låser at nøkler og norske labels matcher skjemaet 1:1.
 */

export const HELPDESK_KATEGORIER = [
  'brukerguide',
  'oppdateringer',
  'booking',
  'kunder',
  'lager',
  'integrasjoner',
  'fakturering',
] as const;

export type HelpdeskKategori = (typeof HELPDESK_KATEGORIER)[number];

export const HELPDESK_KATEGORI_LABEL: Record<HelpdeskKategori, string> = {
  brukerguide: 'Brukerguide',
  oppdateringer: 'Oppdateringer',
  booking: 'Booking',
  kunder: 'Kunder',
  lager: 'Lager',
  integrasjoner: 'Integrasjoner',
  fakturering: 'Fakturering',
};

export const HELPDESK_KATEGORI_DEFAULT: HelpdeskKategori = 'brukerguide';

export function erHelpdeskKategori(verdi: string): verdi is HelpdeskKategori {
  return (HELPDESK_KATEGORIER as readonly string[]).includes(verdi);
}

export function helpdeskKategoriLabel(verdi: string | null | undefined): string {
  if (verdi && erHelpdeskKategori(verdi)) return HELPDESK_KATEGORI_LABEL[verdi];
  return HELPDESK_KATEGORI_LABEL[HELPDESK_KATEGORI_DEFAULT];
}

export function filtrerHelpdesk<T extends { category?: string | null }>(
  artikler: T[],
  valgt: HelpdeskKategori | 'alle',
): T[] {
  if (valgt === 'alle') return artikler;
  return artikler.filter((a) => a.category === valgt);
}
