import { Suspense } from 'react';
import { visDemoHint } from '@/lib/vis-demo-hint';
import { SignInSkjema } from './signin-skjema';

export default function SignInPage() {
  const visHint = visDemoHint({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <SignInSkjema
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
