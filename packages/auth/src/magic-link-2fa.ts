import { randomBytes } from 'node:crypto';
import type { Database } from '@endwise/db';
import { createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { BYTT_PASSORD_ETTER_HOOK_ID } from './bytt-passord.ts';
import { createByttPassordEtterHook } from './bytt-passord-server.ts';
import {
  byggEnrollIdentifier,
  ENROLL_COOKIE_MAX_AGE,
  ENROLL_COOKIE_NAME,
} from './enroll.ts';
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
 */
export const MAGIC_LINK_2FA_HOOK_ID = 'magic-link-krever-totp';

const TWO_FACTOR_COOKIE_NAME = 'two_factor';
const TWO_FACTOR_COOKIE_MAX_AGE = 600;

function merket<T extends object>(fn: T, id: string): T & { endwiseId: string } {
  return Object.assign(fn, { endwiseId: id });
}

async function rivSesjon(ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]) {
  const data = ctx.context.newSession;
  if (!data?.session?.token) return;
  deleteSessionCookie(ctx, true);
  await ctx.context.internalAdapter.deleteSession(data.session.token);
  ctx.context.setNewSession(null);
}

export const magicLink2faEtterHook = merket(
  createAuthMiddleware(async (ctx) => {
    if (ctx.path !== MAGIC_LINK_VERIFY_STI) return;
    const data = ctx.context.newSession;
    if (!data?.user) return;

    await rivSesjon(ctx);

    if (data.user.twoFactorEnabled !== true) {
      const identifier = byggEnrollIdentifier(randomBytes(10).toString('hex'));
      const expiresAt = new Date(Date.now() + ENROLL_COOKIE_MAX_AGE * 1000);
      await ctx.context.internalAdapter.createVerificationValue({
        value: data.user.id,
        identifier,
        expiresAt,
      });
      const cookie = ctx.context.createAuthCookie(ENROLL_COOKIE_NAME, {
        maxAge: ENROLL_COOKIE_MAX_AGE,
      });
      await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes);
      const dest = new URL(MAGIC_LINK_ENROLL_STI, ctx.context.baseURL);
      throw ctx.redirect(dest.toString());
    }

    const identifier = `2fa-${randomBytes(10).toString('hex')}`;
    const expiresAt = new Date(Date.now() + TWO_FACTOR_COOKIE_MAX_AGE * 1000);
    await ctx.context.internalAdapter.createVerificationValue({
      value: data.user.id,
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
    await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes);

    const dest = new URL(MAGIC_LINK_CALLBACK, ctx.context.baseURL);
    dest.search = MAGIC_LINK_TOTP_QUERY;
    throw ctx.redirect(dest.toString());
  }),
  MAGIC_LINK_2FA_HOOK_ID,
);

/** Magic-link-TOTP først (kan kaste redirect), deretter bytt-passord-etter. */
export function createAuthEtterHook(db?: Database) {
  const passordEtter = createByttPassordEtterHook(db);
  return merket(
    createAuthMiddleware(async (ctx) => {
      await magicLink2faEtterHook(ctx);
      await passordEtter(ctx);
    }),
    BYTT_PASSORD_ETTER_HOOK_ID,
  );
}
