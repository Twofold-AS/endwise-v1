import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Kalenderen er en visning inne i Saker, ikke en egen destinasjon. */
export default function KalenderRedirect() {
  redirect('/saker?visning=kalender' as Route);
}
