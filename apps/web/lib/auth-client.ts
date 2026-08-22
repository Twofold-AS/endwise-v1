'use client';

import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * F1 / F13-03 — Better-Auth React-klient. baseURL = current origin;
 * `/api/auth/*` er en Next route handler (same-origin cookie). Organization- +
 * two-factor-klientpluginene speiler serverpluginene.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient(), twoFactorClient()],
});

export const { useSession, signIn, signOut, organization } = authClient;
