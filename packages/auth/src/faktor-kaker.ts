import { ENROLL_COOKIE_NAME } from './enroll.ts';

export const TWO_FACTOR_COOKIE_NAME = 'two_factor';

function kakeAttributter(cookie: { attributes?: { secure?: boolean; maxAge?: number } }) {
  return {
    ...cookie.attributes,
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookie.attributes?.secure ?? true,
  };
}

/**
 * signOut sletter ikke two_factor / enroll_2fa. Leftover HttpOnly-kake
 * etter gammel verify får Fortsett til å snappe til TOTP-veggen.
 */
export function utlopFaktorKaker(ctx: {
  context: {
    createAuthCookie: (
      name: string,
      opts?: { maxAge?: number },
    ) => { name: string; attributes?: { secure?: boolean; maxAge?: number } };
  };
  setCookie: (name: string, value: string, attrs?: Record<string, unknown>) => void;
}): void {
  if (typeof ctx.setCookie !== 'function') return;
  if (typeof ctx.context?.createAuthCookie !== 'function') return;
  for (const navn of [TWO_FACTOR_COOKIE_NAME, ENROLL_COOKIE_NAME]) {
    const cookie = ctx.context.createAuthCookie(navn, { maxAge: 0 });
    ctx.setCookie(cookie.name, '', { ...kakeAttributter(cookie), maxAge: 0 });
  }
}
