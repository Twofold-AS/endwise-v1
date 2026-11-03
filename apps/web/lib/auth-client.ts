'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { magicLinkClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * F1 / F13-03 / F5 — Better-Auth React-klient.
 * Magic link + TOTP. Passkey bare brukt på platform-sonen.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient(), twoFactorClient(), magicLinkClient(), passkeyClient()],
});

export const { useSession, signIn, signOut, organization } = authClient;
