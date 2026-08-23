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
  const q = fra ? `?fra=${encodeURIComponent(fra)}` : '';
  redirect(`/endwise/verksted/${slug}/dashboard${q}`);
}
