import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * Ansatte er expander i sidebaren, ikke en side. Bokmerke /ansatte
 * lander på Team — første barn — i stedet for en rå Next-404.
 */
export default function AnsatteAlias() {
  redirect('/innstillinger/team' as Route);
}
