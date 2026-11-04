/**
 * Avgjør om vercel-migrate skal kjøre, hoppe over, eller stoppe bygget.
 * Turbo 2 strict-mode stripper env som ikke er i globalEnv / passThroughEnv.
 * VERCEL_ENV er i globalEnv; DATABASE_URL må sendes via build.passThroughEnv
 * (ikke globalEnv — hemmeligheten skal ikke inn i cache-nøkkelen).
 * Ikke globalPassThroughEnv: da kjører Docker-RLS-tester i CI som superuser.
 */
export type VercelMigrateMiljo = {
  DATABASE_URL?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  ENDWISE_GA_LIVE?: string;
};

export type VercelMigrateBeslutning =
  | { handling: 'kjør' }
  | { handling: 'hopp'; grunn: string }
  | { handling: 'stopp'; grunn: string };

export function vercelMigrateBeslutning(env: VercelMigrateMiljo): VercelMigrateBeslutning {
  const preview = env.VERCEL_ENV === 'preview';
  const production = env.VERCEL_ENV === 'production';
  const tvungen = env.ENDWISE_GA_LIVE === '1';

  if (preview) {
    return { handling: 'hopp', grunn: `VERCEL_ENV=${env.VERCEL_ENV}` };
  }

  if (!production && !tvungen) {
    return { handling: 'hopp', grunn: 'ikke Vercel production / ENDWISE_GA_LIVE' };
  }

  if (!env.DATABASE_URL?.trim()) {
    if (production) {
      return {
        handling: 'stopp',
        grunn:
          'DATABASE_URL mangler på Vercel production — Turbo må sende den gjennom (build.passThroughEnv)',
      };
    }
    return { handling: 'hopp', grunn: 'DATABASE_URL mangler' };
  }

  return { handling: 'kjør' };
}
