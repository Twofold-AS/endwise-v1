import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Endringer-ruten peker på Timeplan › Avvik. */
export default function TimeplanEndringerAlias() {
  redirect('/jobber?fane=avvik' as Route);
}
