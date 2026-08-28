import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function IntegrasjonerAliasPage() {
  redirect('/organisasjon?seksjon=integrasjoner' as Route);
}
