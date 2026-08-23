import { defineConfig } from 'drizzle-kit';
import { drizzleKitPgCredentials } from './src/client.ts';

// drizzle-kit tar ikke Nodes --env-file-flagg, så vi laster rot-.env her.
// process.loadEnvFile er innebygd (Node 20.12+) — ingen ny avhengighet.
// Kjøres fra packages/db (pnpm --filter), så rot-.env ligger på ../../.env.
// Setter ikke over eksisterende env (allerede satte vars vinner).
try {
  process.loadEnvFile('../../.env');
} catch {
  // .env finnes ikke (eller env er satt på annen måte) — det er greit.
}

const databaseUrl = process.env.DATABASE_URL ?? '';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Host + ssl (rejectUnauthorized:false). Ikke url+sslmode — drizzle-kit
  // 0.31 godtar ikke url+ssl, og Scaleway-CA gir da exit 1 uten SQL-ERROR.
  dbCredentials: databaseUrl ? drizzleKitPgCredentials(databaseUrl) : { url: '' },
  // RLS-policyer og roller er en del av skjemaet (F0-03).
  entities: {
    roles: {
      provider: 'neon',
    },
  },
  strict: true,
  verbose: true,
});
