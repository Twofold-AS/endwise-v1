import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
import {
  BYTT_PASSORD_ETTER_HOOK_ID,
  BYTT_PASSORD_FOR_HOOK_ID,
  BYTT_PASSORD_STI,
  erSkjultAuthFeilkode,
  generiskAuthFeilForSti,
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_ENABLE_STI,
} from './bytt-passord.ts';

/**
 * F1-17 — serverhookene for bytt-passord og like kredential-mutasjoner.
 *
 * Lever i en egen fil fordi `bytt-passord.ts` lastes av web-klienten.
 * En import av `better-auth/api` der ville dratt hele server-grafen inn i
 * bundle.
 */

const KREDENTIAL_STIER = new Set([BYTT_PASSORD_STI, TO_FAKTOR_ENABLE_STI, TO_FAKTOR_DISABLE_STI]);

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

/**
 * CWE-613 — tvinger `revokeOtherSessions: true` på `/change-password`
 * FØR Better-Auths handler kjører.
 *
 * Handleren sletter da alle sesjoner og lager en ny for denne enheten.
 * En request som utelater flagget, eller setter det til `false`, får
 * samme utfall som vår egen klient.
 */
export const byttPassordForHook = merket(
  createAuthMiddleware(async (ctx) => {
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
 * auth-feil i API-svaret. Valideringsfeil på det NYE passordet
 * (`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG`) får stå: de lekker ikke
 * om det gamle var riktig.
 */
export const byttPassordEtterHook = merket(
  createAuthMiddleware(async (ctx) => {
    if (!KREDENTIAL_STIER.has(ctx.path)) return;
    if (!erSkjultAuthFeilkode(feilkodeFraReturned(ctx.context.returned))) return;
    throw new APIError('BAD_REQUEST', generiskAuthFeilForSti(ctx.path));
  }),
  BYTT_PASSORD_ETTER_HOOK_ID,
);
