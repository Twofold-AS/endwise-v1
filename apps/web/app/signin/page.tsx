import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { visDemoHint } from '@/lib/vis-demo-hint';
import { SignInSkjema } from './signin-skjema';
import { harEnrollVindu, harTotpVindu, SIGNIN_ENROLL_STI } from './signin-steg';

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
  const { steg } = await searchParams;
  const header = kakeHeader(await cookies());
  const nyEpost = !steg || steg === 'valg' || steg === 'sendt';
  if (harEnrollVindu(header) && !nyEpost) {
    redirect(SIGNIN_ENROLL_STI as Route);
  }
  const totpKlar = harTotpVindu(header);
  const visHint = visDemoHint({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <SignInSkjema
        totpKlar={totpKlar}
        demoHint={
          visHint ? (
            <p className="mt-4 text-center text-[12px] text-fg-muted">
              Demo-kontoer seedes med <code className="text-fg-muted">pnpm db:seed</code> — logg inn
              med magic link til den seedede e-posten.
            </p>
          ) : null
        }
      />
    </Suspense>
  );
}
