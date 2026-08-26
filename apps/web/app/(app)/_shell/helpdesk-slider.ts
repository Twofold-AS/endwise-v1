/**
 * F5-23 — Minimer-regler for helpdesk-slideren (TipCard).
 *
 * Holdes utenfor React så Ny→åpen og persist kan testes uten å mounte
 * sidebaren. localStorage-nøkkelen er slideren, aldri visningsvelgeren.
 *
 * ── Åpen vs minimert ─────────────────────────────────────────────────────
 * Ulest («Ny») ved lasting tvinger alltid full slider, også hvis brukeren
 * hadde minimert sist. Brukeren kan likevel minimere mens Ny vises.
 * En *ny* ulest artikkel (ny id, eller ulest none→some) åpner igjen —
 * det er «Endwise publiserte mens forhandleren hadde den lukket».
 */

export const HELPDESK_SLIDER_MINIMER_KEY = 'endwise.helpdesk-slider.minimer';

/** `null` = aldri satt. Skiller «første besøk» fra eksplisitt åpen (`0`). */
export function lesLagretMinimer(raw: string | null): boolean | null {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

/**
 * Første visning etter lasting: Ny overstyrer lagret minimert.
 * Tom liste uten lagret valg starter minimert — chrome skal stå, ikke slettes.
 */
export function sliderStartMinimer(
  lagretMinimer: boolean | null,
  harUlest: boolean,
  tom = false,
): boolean {
  if (harUlest) return false;
  if (lagretMinimer !== null) return lagretMinimer;
  return tom;
}

export type SliderArtikkel = { id: string; ulest: boolean };

/**
 * `forrige == null` er første snapshot etter lasting — det er
 * `sliderStartMinimer` sin jobb, ikke «ny sak midt i økten».
 */
/** Test-titler skal ikke vises som produktdokumentasjon. */
export function erTestHelpdeskTittel(title: string): boolean {
  const t = title.trim().toLowerCase();
  return t.includes('mikael testing') || t.includes('halla balla');
}

export function harNyUlestArtikkel(
  forrige: SliderArtikkel[] | null,
  neste: SliderArtikkel[],
): boolean {
  if (forrige == null) return false;
  const kjente = new Set(forrige.map((a) => a.id));
  if (neste.some((a) => a.ulest && !kjente.has(a.id))) return true;
  const haddeUlest = forrige.some((a) => a.ulest);
  const harUlest = neste.some((a) => a.ulest);
  return !haddeUlest && harUlest;
}
