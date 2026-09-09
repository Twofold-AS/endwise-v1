import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Avvik bor på Timeplan › Avvik. */
export default function AvvikAlias() {
  redirect('/jobber?fane=avvik' as Route);
}
