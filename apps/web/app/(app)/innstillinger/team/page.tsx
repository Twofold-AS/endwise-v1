import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Team bor på Organisasjon › Ansatte. */
export default function TeamAlias() {
  redirect('/organisasjon?seksjon=ansatte' as Route);
}
