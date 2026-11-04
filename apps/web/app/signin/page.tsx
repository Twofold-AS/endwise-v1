import { appOffentligUrl, forhandlerOffentligUrl } from '@endwise/auth';
import { lesKundeSlugFraSporsmal } from '@endwise/modules/tenant-host';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignInSkjema } from './signin-skjema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ steg?: string; tenant?: string; slug?: string }>;
}) {
  const params = await searchParams;
  if ((await headers()).get('x-endwise-sone') === 'marked') {
    const q = new URLSearchParams();
    if (params.tenant) q.set('tenant', params.tenant);
    if (params.slug) q.set('slug', params.slug);
    const kundeSlug = lesKundeSlugFraSporsmal(q);
    const kunde = kundeSlug ? forhandlerOffentligUrl(kundeSlug) : null;
    redirect((kunde ? `${kunde}/logg-inn` : `${appOffentligUrl()}/logg-inn`) as Route);
  }

  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <SignInSkjema />
    </Suspense>
  );
}
