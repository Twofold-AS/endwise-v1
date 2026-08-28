import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Mikael 28.08: Forhandleren er Oversikt på /organisasjon. */
export default function ForhandlerenAlias() {
  redirect('/organisasjon' as Route);
}
