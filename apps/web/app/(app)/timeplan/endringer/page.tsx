import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Endringer-ruten peker på Timeplan › Endringer. */
export default function TimeplanEndringerAlias() {
  redirect('/jobber?fane=endringer' as Route);
}
