import { redirect } from 'next/navigation';

/**
 * F5-26 — `/endwise` var «bevisst tom» fram til 07.08.2026, fordi konteksten
 * ikke hadde noe innhold og en tom kontekst uten forklaring leses som en bug.
 *
 * Nå HAR den innhold: Forhandlere. Da er en egen tomhets-side ikke lenger
 * ærlighet, den er et ekstra klikk. Ruten redirigerer til konteksten sin
 * landingsside — samme adresse som `CONTEXTS.endwise.landing` peker på, så
 * gamle bokmerker treffer riktig.
 */
export default function EndwiseAdminPage() {
  redirect('/endwise/forhandlere');
}
