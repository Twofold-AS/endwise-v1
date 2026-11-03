import { createAuth, lesAuthSone } from '@endwise/auth';

/**
 * Better-Auth som Web Request/Response, uten Hono.
 * F5: platform-sone får egen instans (cookie-prefiks, kort sesjon, passkey).
 * Uten flagg: samme instans som før.
 */
let defaultAuth: ReturnType<typeof createAuth> | undefined;
let platformAuth: ReturnType<typeof createAuth> | undefined;

function getAuth(req: Request) {
  const sone = lesAuthSone(req.headers);
  if (sone === 'platform') {
    platformAuth ??= createAuth(undefined, { sone: 'platform' });
    return platformAuth;
  }
  defaultAuth ??= createAuth(undefined, sone ? { sone } : undefined);
  return defaultAuth;
}

export function handleAuth(req: Request): Promise<Response> {
  return getAuth(req).handler(req);
}
