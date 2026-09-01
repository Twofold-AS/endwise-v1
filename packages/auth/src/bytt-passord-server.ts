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
  TO_FAKTOR_SEND_OTP_STI,
  TO_FAKTOR_VERIFY_BACKUP_STI,
  TO_FAKTOR_VERIFY_TOTP_STI,
} from './bytt-passord.ts';
import { eierLasForHook } from './eier-las-server.ts';
import {
  enrollSesjonFraKake,
  slettAndreSesjoner,
  verifiserFerskTotpMotHemmelighet,
} from './enroll-server.ts';
import { MAGIC_LINK_BE_OM_STI, MAGIC_LINK_CALLBACK } from './magic-link.ts';
import { slettEldreMagicLinkTokens } from './magic-link-tokens.ts';
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
  TO_FAKTOR_VERIFY_TOTP_STI,
  TO_FAKTOR_VERIFY_BACKUP_STI,
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
    if (ctx.path === TO_FAKTOR_SEND_OTP_STI) {
      throw new APIError('FORBIDDEN', {
        message: 'E-postkode er ikke andre faktor.',
        code: 'TWO_FACTOR_OTP_DISABLED',
      });
    }
    if (ctx.path === TO_FAKTOR_DISABLE_STI) {
      throw new APIError('FORBIDDEN', {
        message: 'Tofaktor kan ikke slås av selv. Be en leder om å tilbakestille.',
        code: 'TWO_FACTOR_DISABLE_FORBIDDEN',
      });
    }
    if (ctx.path === TO_FAKTOR_ENABLE_STI) {
      const enroll = await enrollSesjonFraKake(ctx);
      if (!enroll) return;
      return { context: { session: enroll } };
    }
    if (ctx.path === TO_FAKTOR_VERIFY_TOTP_STI || ctx.path === TO_FAKTOR_VERIFY_BACKUP_STI) {
      const body = ctx.body;
      if (typeof body !== 'object' || body === null) return;
      const enroll = await enrollSesjonFraKake(ctx);
      return {
        context: {
          body: {
            ...body,
            trustDevice: false,
          },
          ...(enroll ? { session: enroll } : {}),
        },
      };
    }
    if (ctx.path === MAGIC_LINK_BE_OM_STI) {
      const body = ctx.body;
      if (typeof body !== 'object' || body === null) return;
      const epost = 'email' in body && typeof body.email === 'string' ? body.email : '';
      if (epost) await slettEldreMagicLinkTokens(epost);
      return {
        context: {
          body: {
            ...body,
            callbackURL: MAGIC_LINK_CALLBACK,
            errorCallbackURL: MAGIC_LINK_CALLBACK,
          },
        },
      };
    }
    if (ctx.path === BYTT_EPOST_STI) {
      /**
       * E-postbytte er tostegs (bekreftelse til gammel + ny adresse).
       * Passord er borte. TOTP må være på — ellers holder stjålet sesjon
       * (etter magic link uten 2FA) til å peke kontoen mot en fremmed innboks.
       */
      const session = await getSessionFromCtx(ctx);
      if (!session?.user?.id) {
        throw new APIError('UNAUTHORIZED', { message: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
      if (session.user.twoFactorEnabled !== true) {
        throw new APIError('FORBIDDEN', {
          message: 'Tofaktor må være slått på før du bytter e-post.',
          code: 'TWO_FACTOR_REQUIRED',
        });
      }
      await verifiserFerskTotpMotHemmelighet(ctx, session.user.id, ctx.body);
      return;
    }
    if (ctx.path === BYTT_PASSORD_STI) {
      throw new APIError('FORBIDDEN', {
        message: 'Passord er av. Innlogging er magic link + TOTP.',
        code: 'PASSWORD_DISABLED',
      });
    }
  }),
  BYTT_PASSORD_FOR_HOOK_ID,
);

/**
 * CWE-209 / CWE-287 — skiller ikke «feil gammelt passord» fra annen
 * auth-feil i API-svaret. Valideringsfeil på det nye passordet
 * (`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG`) får stå: de lekker ikke
 * om det gamle var riktig.
 * `/two-factor/disable` er FORBIDDEN i before-hook (Mons).
 * Audit `two_factor.disabled` skrives av team-reset, ikke denne stien.
 */
export function createByttPassordEtterHook(db?: Database) {
  return merket(
    createAuthMiddleware(async (ctx) => {
      if (!KREDENTIAL_STIER.has(ctx.path)) return;
      if (erSkjultAuthFeilkode(feilkodeFraReturned(ctx.context.returned))) {
        throw new APIError('BAD_REQUEST', generiskAuthFeilForSti(ctx.path));
      }
      if (isAPIError(ctx.context.returned)) return;
      const userId = brukerIdFraHook(ctx);
      if (
        (ctx.path === TO_FAKTOR_VERIFY_TOTP_STI || ctx.path === TO_FAKTOR_VERIFY_BACKUP_STI) &&
        userId
      ) {
        const token =
          typeof ctx.context.session?.session?.token === 'string'
            ? ctx.context.session.session.token
            : typeof ctx.context.newSession?.session?.token === 'string'
              ? ctx.context.newSession.session.token
              : undefined;
        try {
          await slettAndreSesjoner(ctx, userId, token);
        } catch (error) {
          console.error('[auth] revokeOtherSessions etter TOTP feilet', error);
        }
      }
      if (ctx.path !== TO_FAKTOR_DISABLE_STI || !db) return;
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
