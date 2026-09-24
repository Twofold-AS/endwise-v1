/**
 * Claude BIT 7 — Organisasjon-hub på eksisterende destinasjoner.
 * Ingen ny chrome-pille. Ingen vakt-/Hellanor-/Mailchimp-API.
 */

export const INGEN_API = 'ingen API';

export const ORG_HUB_SEKSJONER = [
  {
    id: 'ansatte',
    label: 'Ansatte',
    href: '/organisasjon?seksjon=ansatte',
    sub: 'Oversikt, profiler og tilganger',
    admin: false,
  },
  {
    id: 'timeplan',
    label: 'Timeplan ansatte',
    href: '/jobber',
    sub: 'Hvem er på jobb hvilke dager',
    admin: false,
  },
  {
    id: 'abonnement',
    label: 'Abonnement',
    href: '/organisasjon?seksjon=abonnement',
    sub: 'Endwise-plan og fakturering',
    admin: true,
  },
  {
    id: 'integrasjoner',
    label: 'Integrasjoner',
    href: '/organisasjon?seksjon=integrasjoner',
    sub: 'Tilkoblede systemer',
    admin: true,
  },
] as const;

export function synligeOrgHub(isAdmin: boolean) {
  return ORG_HUB_SEKSJONER.filter((s) => !s.admin || isAdmin);
}

/** Booking-utledet staff-status i dag — ikke SHIFTS. */
export function erPaJobbNaa(status: string | null | undefined): boolean {
  return status === 'på_jobb' || status === 'opptatt';
}

export function ansattePageSub(antall: number, paJobb: number): string {
  return `${antall} ansatte · ${paJobb} på jobb nå`;
}

export function aboPageSub(planNavn: string | null | undefined): string {
  return planNavn ? `Nåværende plan: ${planNavn}` : 'Nåværende plan: ikke startet';
}

export const INTEGRASJONER_PAGE_SUB = 'Systemer koblet mot Endwise';
