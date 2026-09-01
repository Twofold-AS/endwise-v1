import { randomBytes } from 'node:crypto';
import type { Database } from '@endwise/db';
import { createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { BYTT_PASSORD_ETTER_HOOK_ID } from './bytt-passord.ts';
import { createByttPassordEtterHook } from './bytt-passord-server.ts';
import { byggEnrollIdentifier, ENROLL_COOKIE_MAX_AGE, ENROLL_COOKIE_NAME } from './enroll.ts';
import { TWO_FACTOR_COOKIE_NAME } from './faktor-kaker.ts';
import {
  MAGIC_LINK_CALLBACK,
  MAGIC_LINK_ENROLL_STI,
  MAGIC_LINK_TOTP_QUERY,
  MAGIC_LINK_VERIFY_STI,
} from './magic-link.ts';

/**
 * Better-Auths twoFactor-plugin lytter bare på `/sign-in/email` (osv.).
 * Magic link-verify setter ellers en full sesjon — da holder stjålet innboks.
 * Uenrollert: river sesjonen, setter enroll-kake (ikke app-sesjon).
 * Enrollert: river sesjonen, setter two_factor-kake, krever TOTP.
 *
 * Enrollert TOTP = twoFactorEnabled OG en two_factor-rad med secret.
 * Gammel e-post-OTP / delvis enable kan etterlate flagget uten rad —
 * da er det enroll, ikke «skriv koden fra appen».
 */
export const MAGIC_LINK_2FA_HOOK_ID = 'magic-link-krever-totp';

const TWO_FACTOR_COOKIE_MAX_AGE = 600;
const AUTH_NO_STORE = 'private, no-store, no-cache, must-revalidate';

export { TWO_FACTOR_COOKIE_NAME, utlopFaktorKaker } from './faktor-kaker.ts';

export async function erTotpFaktiskBundet(
  lesRad: (userId: string) => Promise<{ secret?: string | null; verified?: boolean | null } | null>,
  user: { id: string; twoFactorEnabled?: boolean | null },
): Promise<boolean> {
  if (user.twoFactorEnabled !== true) return false;
  const rad = await lesRad(user.id);
  if (!rad?.secret) return false;
  // verifyTotp på sign-in kaster TOTP_NOT_ENABLED når verified === false
  // (leftover enable() uten QR). Da er det enroll, ikke app-kode.
  if (rad.verified === false) return false;
  return true;
}

function merket<T extends object>(fn: T, id: string): T & { endwiseId: string } {
  return Object.assign(fn, { endwiseId: id });
}

type HookCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

async function rivSesjon(ctx: HookCtx) {
  const data = ctx.context.newSession;
  if (!data?.session?.token) return;
  deleteSessionCookie(ctx, true);
  await ctx.context.internalAdapter.deleteSession(data.session.token);
  ctx.context.setNewSession(null);
}

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
 * better-call 1.4.0: setSignedCookie og ctx.redirect deler samme
 * response-headers — Set-Cookie overlever throw FOUND. Vi tvinger
 * path=/, Secure, SameSite=Lax, HttpOnly (prefix endwise) og no-store
 * på 302. Finnes kaker på ctx.headers, returnerer vi 302 Response
 * eksplisitt så en fremtidig better-call ikke dropper dem.
 */
async function settKakeOgOmdiriger(
  ctx: HookCtx,
  cookie: { name: string; attributes?: { secure?: boolean; maxAge?: number } },
  identifier: string,
  dest: string,
): Promise<Response> {
  await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, kakeAttributter(cookie));
  ctx.setHeader('Cache-Control', AUTH_NO_STORE);
  ctx.setHeader('CDN-Cache-Control', 'no-store');
  ctx.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  const kaker = typeof ctx.headers?.getSetCookie === 'function' ? ctx.headers.getSetCookie() : [];
  if (kaker.length > 0) {
    const headers = new Headers({
      Location: dest,
      'Cache-Control': AUTH_NO_STORE,
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    });
    for (const kake of kaker) headers.append('Set-Cookie', kake);
    return new Response(null, { status: 302, headers });
  }
  throw ctx.redirect(dest);
}

async function startEnroll(ctx: HookCtx, userId: string): Promise<Response> {
  const identifier = byggEnrollIdentifier(randomBytes(10).toString('hex'));
  const expiresAt = new Date(Date.now() + ENROLL_COOKIE_MAX_AGE * 1000);
  await ctx.context.internalAdapter.createVerificationValue({
    value: userId,
    identifier,
    expiresAt,
  });
  const cookie = ctx.context.createAuthCookie(ENROLL_COOKIE_NAME, {
    maxAge: ENROLL_COOKIE_MAX_AGE,
  });
  const dest = new URL(MAGIC_LINK_ENROLL_STI, ctx.context.baseURL);
  return settKakeOgOmdiriger(ctx, cookie, identifier, dest.toString());
}

async function startTotp(ctx: HookCtx, userId: string): Promise<Response> {
  const identifier = `2fa-${randomBytes(10).toString('hex')}`;
  const expiresAt = new Date(Date.now() + TWO_FACTOR_COOKIE_MAX_AGE * 1000);
  await ctx.context.internalAdapter.createVerificationValue({
    value: userId,
    identifier,
    expiresAt,
  });
  await ctx.context.internalAdapter.createVerificationValue({
    value: '0',
    identifier: `2fa-attempts-${identifier}`,
    expiresAt,
  });
  const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, {
    maxAge: TWO_FACTOR_COOKIE_MAX_AGE,
  });
  const dest = new URL(MAGIC_LINK_CALLBACK, ctx.context.baseURL);
  dest.search = MAGIC_LINK_TOTP_QUERY;
  return settKakeOgOmdiriger(ctx, cookie, identifier, dest.toString());
}

export const magicLink2faEtterHook = merket(
  createAuthMiddleware(async (ctx) => {
    if (ctx.path !== MAGIC_LINK_VERIFY_STI) return;
    const data = ctx.context.newSession;
    if (!data?.user) return;

    await rivSesjon(ctx);

    const lesRad = async (userId: string) => {
      try {
        return (await ctx.context.adapter.findOne({
          model: 'twoFactor',
          where: [{ field: 'userId', value: userId }],
        })) as { secret?: string | null; verified?: boolean | null } | null;
      } catch {
        return null;
      }
    };

    const bundet = await erTotpFaktiskBundet(lesRad, data.user);
    if (!bundet) {
      if (data.user.twoFactorEnabled === true) {
        try {
          await ctx.context.internalAdapter.updateUser(data.user.id, {
            twoFactorEnabled: false,
          });
        } catch {
          // 0036 + neste verify heler. Missed migrate skal ikke låse ute.
        }
      }
      return startEnroll(ctx, data.user.id);
    }

    return startTotp(ctx, data.user.id);
  }),
  MAGIC_LINK_2FA_HOOK_ID,
);

/** Magic-link-TOTP først (kan kaste redirect), deretter bytt-passord-etter. */
export function createAuthEtterHook(db?: Database) {
  const passordEtter = createByttPassordEtterHook(db);
  return merket(
    createAuthMiddleware(async (ctx) => {
      const ut = await magicLink2faEtterHook(ctx);
      if (ut instanceof Response) return ut;
      await passordEtter(ctx);
    }),
    BYTT_PASSORD_ETTER_HOOK_ID,
  );
}
