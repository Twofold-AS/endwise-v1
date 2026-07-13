import { defineConfig } from 'drizzle-kit';

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
