import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function VerkstedInspectIndex({
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
  redirect(`/endwise/verksted/${slug}/dashboard${q}` as Route);
}
