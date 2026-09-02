import { cookies } from 'next/headers';
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
  searchParams: Promise<{ steg?: string }>;
}) {
  await searchParams;
  const header = kakeHeader(await cookies());
  const totpKlar = harTotpVindu(header);

  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <SignInSkjema totpKlar={totpKlar} />
    </Suspense>
  );
}
