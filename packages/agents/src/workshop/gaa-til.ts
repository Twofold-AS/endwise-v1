/** Kjente in-app-ruter Ronny kan åpne. Ingen eksterne URL-er. */
export const GAA_TIL_HVITE: readonly string[] = [
  '/bookinger/ny',
  '/kunder',
  '/innboks',
  '/lager',
  '/butikk',
  '/organisasjon',
  '/dashboard',
  '/dine-jobber',
  '/endwise',
  '/endwise/innboks',
  '/endwise/forhandlere',
  '/endwise/team',
  '/endwise/helpdesk',
  '/endwise/flagg',
];

const KUNDE_DETALJ = /^\/kunder\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function erTillattGaaTil(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('://')) return false;
  const path = href.split('?')[0] ?? href;
  // Kunde-UUID sjekkes kun på format. At raden finnes i *denne* tenanten
  // verifiseres ikke her — residual: klienten åpner stien, RLS skjuler andre.
  return GAA_TIL_HVITE.includes(path) || KUNDE_DETALJ.test(path);
}
