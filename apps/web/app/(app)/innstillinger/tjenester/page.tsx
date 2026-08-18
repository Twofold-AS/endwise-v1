import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * F5-19 — Tjenester & priser bor under Settings i den nye strukturen, men
 * implementasjonen ligger fortsatt på `/tjenester` (F5-04). Redirect i stedet
 * for en kopi: én katalog, én sannhet.
 */
export default function TjenesterRedirect() {
  redirect('/tjenester' as Route);
}
