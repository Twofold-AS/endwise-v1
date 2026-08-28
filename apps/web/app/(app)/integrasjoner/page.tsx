import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function IntegrasjonerAlias() {
  redirect('/organisasjon?seksjon=integrasjoner' as Route);
}
