import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vercelMigrateBeslutning } from './vercel-migrate-beslutning.ts';

/**
 * Trygt migreringssteg ved Vercel production-deploy.
 * Kjører drizzle-migrate + grants mot Scaleway når DATABASE_URL finnes
 * og VERCEL_ENV=production (eller ENDWISE_GA_LIVE=1).
 * Preview hopper over — samme URL peker ofte på prod-DB.
 * Production uten DATABASE_URL stopper bygget (ikke stille hopp).
 */
const here = dirname(fileURLToPath(import.meta.url));
const beslutning = vercelMigrateBeslutning(process.env);

if (beslutning.handling === 'stopp') {
  console.error(`[db] ${beslutning.grunn}`);
  process.exit(1);
}

if (beslutning.handling === 'hopp') {
  console.info(`[db] hopper over migrate (${beslutning.grunn})`);
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
