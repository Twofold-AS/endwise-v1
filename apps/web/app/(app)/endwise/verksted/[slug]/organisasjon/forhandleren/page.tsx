import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Forhandleren er Oversikt på Organisasjon. */
export default async function InspectForhandlerenAlias({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fra?: string }>;
}) {
  const { slug } = await params;
  const { fra } = await searchParams;
  const q = fra ? `?fra=${encodeURIComponent(fra)}` : '';
  redirect(`/endwise/verksted/${slug}/organisasjon${q}` as Route);
}
