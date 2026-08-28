import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function AbonnementAlias() {
  redirect('/organisasjon?seksjon=abonnement' as Route);
}
