import { passkey } from '@better-auth/passkey';
import {
  type AuthSone,
  appOffentligUrl,
  forhandlerOffentligUrl,
  platformOffentligUrl,
  platformRpId,
  rotDomene,
} from './sone.ts';

function appRpId(env: Record<string, string | undefined> = process.env): string {
  try {
    return new URL(appOffentligUrl(env)).hostname;
  } catch {
    return `app.${rotDomene(env)}`;
  }
}

/**
 * WebAuthn/passnøkkel per auth-sone.
 * rpID må matche verten: platform, app eller <slug>.endwise.no.
 */
export function passkeyPlugin(opts?: { sone?: AuthSone; slug?: string }) {
  const sone = opts?.sone;
  if (sone === 'app') {
    return passkey({
      rpID: appRpId(),
      rpName: 'Endwise',
      origin: appOffentligUrl(),
    });
  }
  if (sone === 'forhandler' && opts?.slug) {
    const url = forhandlerOffentligUrl(opts.slug);
    let host = rotDomene();
    try {
      if (url) host = new URL(url).hostname;
    } catch {
      host = rotDomene();
    }
    return passkey({
      rpID: host,
      rpName: 'Endwise',
      origin: url ?? `https://${host}`,
    });
  }
  return passkey({
    rpID: platformRpId(),
    rpName: 'Endwise',
    origin: platformOffentligUrl(),
  });
}
