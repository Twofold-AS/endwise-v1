import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Jonas 28.08: Ansatte lander på første pille — Team. */
export default function AnsatteAlias() {
  redirect('/innstillinger/team' as Route);
}
