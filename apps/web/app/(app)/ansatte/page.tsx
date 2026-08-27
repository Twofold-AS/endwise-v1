import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * Ansatte er expander i sidebaren, ikke en side. Bokmerke /ansatte
 * lander på Forhandleren — første barn — i stedet for en rå Next-404.
 */
export default function AnsatteAlias() {
  redirect('/organisasjon/forhandleren' as Route);
}
