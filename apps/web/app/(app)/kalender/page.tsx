import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** F5-15 — Kalenderen er en VISNING inne i Saker, ikke en egen destinasjon. */
export default function KalenderRedirect() {
  redirect('/saker?visning=kalender' as Route);
}
