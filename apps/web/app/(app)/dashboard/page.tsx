import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * Gammel forhandler-landing. Kanonisk rute er `/home`.
 * Query (`?visning=dag`) beholdes så gamle lenker lander riktig.
 */
export default async function DashboardRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') q.set(k, v);
    else if (Array.isArray(v)) for (const x of v) q.append(k, x);
  }
  const qs = q.toString();
  redirect((qs ? `/home?${qs}` : '/home') as Route);
}
