import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function ForhandlerenAlias() {
  redirect('/organisasjon' as Route);
}
