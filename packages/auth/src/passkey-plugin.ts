import { passkey } from '@better-auth/passkey';
import { platformOffentligUrl, platformRpId } from './sone.ts';

/**
 * F5 — WebAuthn bare på platform-instansen.
 * `@better-auth/passkey@1.7.15` matcher better-auth 1.7.x (ikke 1.4-core).
 */
export function passkeyPlugin() {
  return passkey({
    rpID: platformRpId(),
    rpName: 'Endwise',
    origin: platformOffentligUrl(),
  });
}
