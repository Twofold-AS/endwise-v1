import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Mikael 28.08: Prisliste er blokk på Organisasjon → Oversikt. */
export default function PrislisteAlias() {
  redirect('/organisasjon' as Route);
}
