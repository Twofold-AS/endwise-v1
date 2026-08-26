import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * AI-flaten er nå en egen destinasjon i sidebaren (`/ai-innsikt`), ikke
 * en integrasjonsinnstilling. Stien beholdes som redirect: den har vært lenket
 * fra nav og rapporter siden.
 */
export default function AiRedirect() {
  redirect('/ai-innsikt' as Route);
}
