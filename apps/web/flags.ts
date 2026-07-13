import { edgeConfigAdapter } from '@flags-sdk/edge-config';
import { flag } from 'flags/next';

/**
 * F0-04 — Release-toggles via Vercel Flags SDK + Edge Config.
 *
 * Dette laget svarer på «har VI rullet ut funksjonen?».
 * «Har forhandleren kjøpt modulen?» besvares av tenant_modules i DB
 * (@endwise/modules -> createEntitlements). Ikke bland dem.
 *
 * Krever FLAGS_SECRET + EDGE_CONFIG i miljøet.
 */
export const killSwitch = flag<boolean>({
  key: 'kill-switch',
  adapter: edgeConfigAdapter,
  defaultValue: false,
  description: 'Global kill-switch — stenger nye skrivende operasjoner.',
});
