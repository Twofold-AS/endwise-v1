import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Trygt migreringssteg ved Vercel production-deploy.
 * Kjører drizzle-migrate + grants mot Scaleway når DATABASE_URL finnes.
 * Preview hopper over — samme URL peker ofte på prod-DB.
 */
const here = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.info('[db] hopper over migrate (DATABASE_URL mangler)');
  process.exit(0);
}

if (process.env.VERCEL && process.env.VERCEL_ENV !== 'production') {
  console.info(`[db] hopper over migrate (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  process.exit(0);
}

if (!process.env.VERCEL && process.env.ENDWISE_GA_LIVE !== '1') {
  console.info('[db] hopper over migrate (ikke Vercel production / ENDWISE_GA_LIVE)');
  process.exit(0);
}

function kjor(fil: string) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', join(here, fil)], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`[db] ${fil} feilet`);
    process.exit(result.status ?? 1);
  }
}

kjor('repair-0020.ts');
kjor('migrate.ts');
kjor('grants.ts');
console.info('[db] vercel-migrate ferdig');
