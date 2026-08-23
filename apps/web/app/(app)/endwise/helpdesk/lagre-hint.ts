/**
 * F5-23 — klienthint for Opprett/Lagre på /endwise/helpdesk.
 *
 * Speiler `artikkelFelter` i `apps/api/src/trpc/routers/helpdesk.ts`
 * (`title.min(3)`, `summary.min(10)`, `body.min(10)` etter trim).
 * Knappen er disabled på samme terskler; hintet forklarer *hvorfor*,
 * ett felt om gangen — første som feiler.
 */

export const HELPDESK_MIN = {
  title: 3,
  summary: 10,
  body: 10,
} as const;

export function hjelpeartikkelLagreHint(felt: {
  title: string;
  summary: string;
  body: string;
}): string | null {
  if (felt.title.trim().length < HELPDESK_MIN.title) {
    return `Overskrift må være minst ${HELPDESK_MIN.title} tegn`;
  }
  if (felt.summary.trim().length < HELPDESK_MIN.summary) {
    return `Ingress må være minst ${HELPDESK_MIN.summary} tegn`;
  }
  if (felt.body.trim().length < HELPDESK_MIN.body) {
    return `Brødtekst må være minst ${HELPDESK_MIN.body} tegn`;
  }
  return null;
}
