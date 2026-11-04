import { appOffentligUrl, forhandlerOffentligUrl } from '@endwise/auth';
import { lesKundeSlugFraSporsmal } from '@endwise/modules/tenant-host';
import type { Route } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignInSkjema } from './signin-skjema';
import { harTotpVindu } from './signin-steg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * two_factor / enroll_2fa er HttpOnly. document.cookie ser dem ikke —
 * da ble klikk-landing venteskjerm og tokenet allerede brukt.
 */
function kakeHeader(jar: Awaited<ReturnType<typeof cookies>>): string {
  return jar
    .getAll()
    .map((c) => `${c.name}=1`)
    .join('; ');
}

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
  const header = kakeHeader(await cookies());
  const totpKlar = harTotpVindu(header);

  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <SignInSkjema totpKlar={totpKlar} />
    </Suspense>
  );
}
