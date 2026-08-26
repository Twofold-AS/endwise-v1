import type { Database } from '@endwise/db';
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from 'better-auth/api';
import { BYTT_EPOST_STI } from './bytt-epost.ts';
import {
  BYTT_PASSORD_ETTER_HOOK_ID,
  BYTT_PASSORD_FOR_HOOK_ID,
  BYTT_PASSORD_STI,
  erSkjultAuthFeilkode,
  generiskAuthFeilForSti,
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_ENABLE_STI,
} from './bytt-passord.ts';
import { eierLasForHook } from './eier-las-server.ts';
import { skriv2faDisableAudit } from './to-faktor-server.ts';

/**
 * Serverhookene for bytt-passord og like kredential-mutasjoner.
 * Lever i en egen fil fordi `bytt-passord.ts` lastes av web-klienten.
 * En import av `better-auth/api` der ville dratt hele server-grafen inn i
 * bundle.
 */

const KREDENTIAL_STIER = new Set([
  BYTT_PASSORD_STI,
  TO_FAKTOR_ENABLE_STI,
  TO_FAKTOR_DISABLE_STI,
  BYTT_EPOST_STI,
]);

function merket<T extends object>(fn: T, id: string): T & { endwiseId: string } {
  return Object.assign(fn, { endwiseId: id });
}

function feilkodeFraReturned(returned: unknown): string | undefined {
  if (!isAPIError(returned)) return undefined;
  const body = returned.body;
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function passordFraBody(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  if (!('password' in body)) return undefined;
  const verdi = (body as { password?: unknown }).password;
  return typeof verdi === 'string' ? verdi : undefined;
}

function brukerIdFraHook(ctx: {
  context: { session?: { user?: { id?: unknown } } };
}): string | undefined {
  const id = ctx.context.session?.user?.id;
  return typeof id === 'string' ? id : undefined;
}

/**
 * CWE-613 — tvinger `revokeOtherSessions: true` på `/change-password`
 * Før Better-Auths handler kjører.
 * Nekter `/two-factor/disable` uten passord. Better-Auth krever
 * det allerede for credential-kontoer; hooken er sperren mot en fremtid
 * der et klientflagg eller `allowPasswordless` ville sluppet gjennom.
 */
export const byttPassordForHook = merket(
  createAuthMiddleware(async (ctx) => {
    await eierLasForHook(ctx);
    if (ctx.path === TO_FAKTOR_DISABLE_STI || ctx.path === BYTT_EPOST_STI) {
      const password = passordFraBody(ctx.body);
      if (password === undefined || password.trim().length === 0) {
        throw new APIError('BAD_REQUEST', generiskAuthFeilForSti(ctx.path));
      }
      if (ctx.path === BYTT_EPOST_STI) {
        /**
         * Session-middleware på `/change-email` kjører etter hooks.before.
         * Uten `getSessionFromCtx` her er `ctx.context.session` tom, og
         * `checkPassword` hoppes over — da holder det med en åpen sesjon
         * pluss en vilkårlig passordstreng.
         */
        const session = await getSessionFromCtx(ctx);
        const userId = session?.user?.id;
        const check = (
          ctx as {
            context?: {
              password?: { checkPassword?: (id: string, c: unknown) => Promise<unknown> };
            };
          }
        ).context?.password?.checkPassword;
        if (typeof userId !== 'string' || typeof check !== 'function') {
          throw new APIError('UNAUTHORIZED', { message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }
        try {
          await check(userId, ctx);
        } catch (error) {
          if (erSkjultAuthFeilkode(feilkodeFraReturned(error))) {
            throw new APIError('BAD_REQUEST', generiskAuthFeilForSti(ctx.path));
          }
          throw error;
        }
      }
      return;
    }
    if (ctx.path !== BYTT_PASSORD_STI) return;
    const body = ctx.body;
    if (typeof body !== 'object' || body === null) return;
    return {
      context: {
        body: {
          ...body,
          revokeOtherSessions: true,
        },
      },
    };
  }),
  BYTT_PASSORD_FOR_HOOK_ID,
);

/**
 * CWE-209 / CWE-287 — skiller ikke «feil gammelt passord» fra annen
 * auth-feil i API-svaret. Valideringsfeil på det nye passordet
 * (`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG`) får stå: de lekker ikke
 * om det gamle var riktig.
 * På `/two-factor/disable` skriver en vellykket avslutting til
 * audit_log (F1-22). `db` er den samme instansen `createAuth` fikk
 * ikke en ny pool mot env.
 */
export function createByttPassordEtterHook(db?: Database) {
  return merket(
    createAuthMiddleware(async (ctx) => {
      if (!KREDENTIAL_STIER.has(ctx.path)) return;
      if (erSkjultAuthFeilkode(feilkodeFraReturned(ctx.context.returned))) {
        throw new APIError('BAD_REQUEST', generiskAuthFeilForSti(ctx.path));
      }
      if (ctx.path !== TO_FAKTOR_DISABLE_STI || !db) return;
      if (isAPIError(ctx.context.returned)) return;
      const userId = brukerIdFraHook(ctx);
      if (!userId) return;
      try {
        await skriv2faDisableAudit(db, userId);
      } catch (error) {
        console.error('[auth] 2FA-disable: audit_log ble ikke skrevet', error);
      }
    }),
    BYTT_PASSORD_ETTER_HOOK_ID,
  );
}

export const byttPassordEtterHook = createByttPassordEtterHook();
