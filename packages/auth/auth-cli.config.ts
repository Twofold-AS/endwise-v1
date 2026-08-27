/**
 * Kun for Better Auth CLI (`auth` / `better-auth generate`). Ikke runtime.
 * CLI-en trenger en konkret `auth`-eksport; runtime bruker createAuth.
 */
import { createAuth } from './src/auth.ts';

export const auth = createAuth();
