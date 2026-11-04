import { Suspense } from 'react';
import { BedriftLoggInnSkjema } from './_skjema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function BedriftLoggInn() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <BedriftLoggInnSkjema />
    </Suspense>
  );
}
