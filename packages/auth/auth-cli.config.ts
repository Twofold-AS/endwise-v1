/**
 * Kun for @better-auth/cli (schema-generering). Ikke en del av runtime.
 * CLI-en trenger en konkret `auth`-eksport; runtime bruker createAuth.
 */
import { createAuth } from './src/auth.ts';

export const auth = createAuth();
