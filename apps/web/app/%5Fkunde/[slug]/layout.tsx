import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hentOffentligKunde } from '../_lib/hent.ts';
import { UkjentSide } from '../_lib/ukjent-side.tsx';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return { title: 'Siden finnes ikke', robots: { index: false, follow: false } };
  return { title: tenant.visningsnavn };
}

export default async function KundeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;
  return children;
}
