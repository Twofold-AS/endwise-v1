import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** `/min-side` er rewrite-mål, derfor `as Route`. */
export default function KundeVelg() {
  redirect('/min-side' as Route);
}
