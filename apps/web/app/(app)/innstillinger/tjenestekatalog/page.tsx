import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Mikael 28.08: Prisliste bor på Organisasjon → Oversikt. */
export default function TjenestekatalogAlias() {
  redirect('/organisasjon' as Route);
}
