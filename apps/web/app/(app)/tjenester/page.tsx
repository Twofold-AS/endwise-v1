import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function TjenesterAlias() {
  redirect('/organisasjon?seksjon=abonnement' as Route);
}
