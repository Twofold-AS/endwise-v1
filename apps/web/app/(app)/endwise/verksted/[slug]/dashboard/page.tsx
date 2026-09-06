import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * Gammel inspect-landing. Kanonisk rute er `/endwise/verksted/[slug]/home`.
 */
export default async function VerkstedDashboardRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fra?: string }>;
}) {
  const { slug } = await params;
  const { fra } = await searchParams;
  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect('/endwise' as Route);
  }
  const q = fra ? `?fra=${encodeURIComponent(fra)}` : '';
  redirect(`/endwise/verksted/${slug}/home${q}` as Route);
}
