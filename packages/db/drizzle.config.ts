import { defineConfig } from 'drizzle-kit';

// drizzle-kit tar ikke Nodes --env-file-flagg, så vi laster rot-.env her.
// process.loadEnvFile er innebygd (Node 20.12+) — ingen ny avhengighet.
// Kjøres fra packages/db (pnpm --filter), så rot-.env ligger på ../../.env.
// Setter ikke over eksisterende env (allerede satte vars vinner).
try {
  process.loadEnvFile('../../.env');
} catch {
  // .env finnes ikke (eller env er satt på annen måte) — det er greit.
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // RLS-policyer og roller er en del av skjemaet (F0-03).
  entities: {
    roles: {
      provider: 'neon',
    },
  },
  strict: true,
  verbose: true,
});
