import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { PlattformLoggInnSkjema } from './_skjema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function kakeHeader(jar: Awaited<ReturnType<typeof cookies>>): string {
  return jar
    .getAll()
    .map((c) => `${c.name}=1`)
    .join('; ');
}

export default async function PlattformLoggInn({
  searchParams,
}: {
  searchParams: Promise<{ steg?: string }>;
}) {
  const q = await searchParams;
  const header = kakeHeader(await cookies());
  const harSesjon = /endwise(?:-pl)?\.session_token=/.test(header);
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <PlattformLoggInnSkjema startSteg={q.steg === 'nokkel' || harSesjon ? 'nokkel' : 'epost'} />
    </Suspense>
  );
}
