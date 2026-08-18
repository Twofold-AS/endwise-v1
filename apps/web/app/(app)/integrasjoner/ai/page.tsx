import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * F5-13 — AI-flaten er nå en egen destinasjon i sidebaren (`/ai-innsikt`), ikke
 * en integrasjonsinnstilling. Stien beholdes som redirect: den har vært lenket
 * fra nav og rapporter siden 03.08.2026.
 */
export default function AiRedirect() {
  redirect('/ai-innsikt' as Route);
}
