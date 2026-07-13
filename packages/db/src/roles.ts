import { pgRole } from 'drizzle-orm/pg-core';

/**
 * F0-03 — DB-roller.
 * `authenticated` er rollen applikasjonen kobler seg til med i runtime.
 * Migrasjoner kjøres som eier (BYPASSRLS) — aldri fra app-stien.
 */
export const authenticatedRole = pgRole('authenticated');
