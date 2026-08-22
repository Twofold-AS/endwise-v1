import { visDemoHint } from '@/lib/vis-demo-hint';
import { SignInSkjema } from './signin-skjema';

/**
 * F1-02 / F1-26 — innlogging. Seed-hintet er en server-avgjørelse.
 *
 * CWE-215: produksjon (`NODE_ENV=production` / `VERCEL_ENV=production`) skal
 * ikke nevne `pnpm db:seed`, demo-kontoer eller passord. Preview/dev kan vise
 * hintet fordi `visDemoHint` sjekker env, ikke en kommentar. Teksten bor her
 * (server) så den ikke følger med i klientbunten når sjekken er nei.
 */
export default function SignInPage() {
  const visHint = visDemoHint({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  return (
    <SignInSkjema
      demoHint={
        visHint ? (
          <p className="mt-4 text-center text-[12px] text-fg-muted">
            Demo-kontoer seedes med <code className="text-fg-muted">pnpm db:seed</code> — se
            rapporten for e-post/passord.
          </p>
        ) : null
      }
    />
  );
}

/**
 * ⚠️ `Field` og `INPUT` lå HER fram til 22.08.2026 og er flyttet til
 * `app/_auth/felter.tsx`. `/glemt-passord` og `/nytt-passord` bruker de samme
 * feltene, og tre kopier av en inputstil blir tre ulike inputstiler ved neste
 * justering av eierens kontrollspec.
 */
