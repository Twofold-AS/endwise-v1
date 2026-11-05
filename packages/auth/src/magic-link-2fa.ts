import { type Database, eq, schema } from '@endwise/db';
import { createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { lesAuthTenantId } from './auth-request.ts';
import { BYTT_PASSORD_ETTER_HOOK_ID } from './bytt-passord.ts';
import { createByttPassordEtterHook } from './bytt-passord-server.ts';
import { harBedriftRolle, harForhandlerRolle, knyttKundeUser } from './forhandler-konto.ts';
import {
  MAGIC_LINK_APP_LANDING,
  MAGIC_LINK_ENROLL_STI,
  MAGIC_LINK_VERIFY_STI,
} from './magic-link.ts';
import { brukerHarPasskey } from './plattform-passkey.ts';
import type { AuthSone } from './sone.ts';

/**
 * Etter magic-link-verify: behold sesjon. Bedrift uten passnøkkel → /2fa-oppsett.
 * Aldri TOTP-mur. Forhandler uten medlemskap: riv sesjon.
 */

export type MagicLinkEtterVerify = { handling: 'behold-sesjon'; dest: string };

/** Forhandler-verify: sesjon bare ved kunde hos DENNE tenanten eller ansatt. */
export function forhandlerVerifyMedlemskap(input: {
  tenantId: string | null | undefined;
  harRolle: boolean;
  kundeId: string | null;
}): 'behold' | 'riv' {
  if (!input.tenantId) return 'riv';
  if (input.harRolle || input.kundeId) return 'behold';
  return 'riv';
}

/** Ren avgjørelse etter magic-link-verify. Ingen sideeffekter. Aldri TOTP-mur. */
export function etterMagicLinkVerify(
  bundet: boolean,
  wl?: { aktiv: boolean; harRolle: boolean; kreverTotp?: boolean },
): MagicLinkEtterVerify {
  if (wl?.aktiv) {
    if (!wl.harRolle) return { handling: 'behold-sesjon', dest: '/min-side' };
    if (!bundet) return { handling: 'behold-sesjon', dest: MAGIC_LINK_ENROLL_STI };
    return { handling: 'behold-sesjon', dest: '/velg' };
  }
  if (wl?.kreverTotp && !bundet) {
    return { handling: 'behold-sesjon', dest: MAGIC_LINK_ENROLL_STI };
  }
  return { handling: 'behold-sesjon', dest: MAGIC_LINK_APP_LANDING };
}
export const MAGIC_LINK_2FA_HOOK_ID = 'magic-link-krever-totp';

const AUTH_NO_STORE = 'private, no-store, no-cache, must-revalidate';

export { TWO_FACTOR_COOKIE_NAME, utlopFaktorKaker } from './faktor-kaker.ts';

export async function erTotpFaktiskBundet(
  lesRad: (userId: string) => Promise<{ secret?: string | null; verified?: boolean | null } | null>,
  user: { id: string; twoFactorEnabled?: boolean | null },
): Promise<boolean> {
  if (user.twoFactorEnabled !== true) return false;
  const rad = await lesRad(user.id);
  if (!rad?.secret) return false;
  // leftover enable() uten QR: verified === false. Ubundet, ikke TOTP-mur.
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

function omdirigerTilApp(ctx: HookCtx, sti = MAGIC_LINK_APP_LANDING): Response {
  const dest = new URL(sti, ctx.context.baseURL).toString();
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

function erOmdirigering(error: unknown): boolean {
  if (error instanceof Response) return error.status >= 300 && error.status < 400;
  if (!error || typeof error !== 'object') return false;
  const status = 'status' in error ? Number(error.status) : 0;
  return status >= 300 && status < 400;
}

export function createMagicLink2faEtterHook(db?: Database, opts?: { sone?: AuthSone }) {
  return merket(
    createAuthMiddleware(async (ctx) => {
      try {
        if (ctx.path !== MAGIC_LINK_VERIFY_STI) return;
        const data = ctx.context.newSession;
        if (!data?.user) return;

        const bundet = db ? await brukerHarPasskey(db, data.user.id).catch(() => false) : false;
        const tenantId = lesAuthTenantId();
        let harRolle = false;
        if (opts?.sone === 'forhandler' && (!tenantId || !db)) {
          await rivSesjon(ctx);
          return omdirigerTilApp(ctx, '/logg-inn');
        }
        if (tenantId && db) {
          harRolle = await harForhandlerRolle(db, data.user.id, tenantId);
          const kundeId = await knyttKundeUser(db, tenantId, data.user.id, data.user.email).catch(
            () => null,
          );
          if (forhandlerVerifyMedlemskap({ tenantId, harRolle, kundeId }) === 'riv') {
            await rivSesjon(ctx);
            return omdirigerTilApp(ctx, '/logg-inn');
          }
          try {
            await db
              .update(schema.session)
              .set({
                kontekst: 'privat',
                activeOrganizationId: tenantId,
                bedriftVerifisertAt: null,
                bedriftUtloperAt: null,
              })
              .where(eq(schema.session.token, data.session.token));
          } catch {
            // Neste request setter kontekst.
          }
        }
        const kreverTotp = Boolean(
          harRolle || (db && (await harBedriftRolle(db, data.user.id).catch(() => false))),
        );
        const neste = etterMagicLinkVerify(bundet, {
          aktiv: Boolean(tenantId),
          harRolle,
          kreverTotp,
        });
        return omdirigerTilApp(ctx, neste.dest);
      } catch (error) {
        if (error instanceof Response) return error;
        if (erOmdirigering(error)) throw error;
        return;
      }
    }),
    MAGIC_LINK_2FA_HOOK_ID,
  );
}

export const magicLink2faEtterHook = createMagicLink2faEtterHook();

/** Magic-link-TOTP først (kan kaste redirect), deretter bytt-passord-etter. */
export function createAuthEtterHook(db?: Database, opts?: { sone?: AuthSone }) {
  const passordEtter = createByttPassordEtterHook(db);
  const magicEtter = createMagicLink2faEtterHook(db, opts);
  return merket(
    createAuthMiddleware(async (ctx) => {
      const ut = await magicEtter(ctx);
      if (ut instanceof Response) return ut;
      await passordEtter(ctx);
    }),
    BYTT_PASSORD_ETTER_HOOK_ID,
  );
}
