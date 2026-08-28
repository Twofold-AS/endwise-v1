import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function AnsatteAlias() {
  redirect('/organisasjon?seksjon=ansatte' as Route);
}
