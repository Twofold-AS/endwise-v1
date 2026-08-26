import { pgRole } from 'drizzle-orm/pg-core';

/**
 * DB-roller.
 * `authenticated` er rollen applikasjonen kobler seg til med i runtime.
 * Migrasjoner kjøres som eier (bypassrls) — aldri fra app-stien.
 */
export const authenticatedRole = pgRole('authenticated');
