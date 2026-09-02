'use client';

import { magicLinkClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * F1 / F13-03 — Better-Auth React-klient. Magic link + TOTP, ingen passord.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient(), twoFactorClient(), magicLinkClient()],
});

export const { useSession, signIn, signOut, organization } = authClient;
