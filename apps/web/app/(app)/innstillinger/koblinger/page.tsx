import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function KoblingerAlias() {
  redirect('/organisasjon?seksjon=integrasjoner' as Route);
}
