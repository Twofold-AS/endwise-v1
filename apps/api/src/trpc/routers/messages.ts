import { sendInboxMessage } from '@endwise/auth';
import {
  createMessagesModule,
  NotAParticipantError,
  PlatformSupportInvalidTenantError,
  PlatformSupportNoDealerAdminError,
  PlatformSupportNotFoundError,
  type UtgaaendeEpost,
} from '@endwise/modules/messages';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { endwiseSupportProcedure, protectedProcedure, router } from '../init.ts';

/**
 * Den konkrete e-postkanalen for utgående meldinger.
 * `undefined` når `RESEND_API_KEY` mangler, og det er meningen. Modulen
 * markerer da meldingen `failed` med «E-postkanalen er ikke konfigurert» i
 * stedet for å late som den gikk. Lokalt uten Resend ser man altså at den ikke
 * ble sendt — som er sannheten.
 */
const epostkanal: UtgaaendeEpost | undefined = process.env.RESEND_API_KEY
  ? { send: (input) => sendInboxMessage(input) }
  : undefined;

const meldinger = (db: Parameters<typeof createMessagesModule>[0]) =>
  createMessagesModule(db, { epost: epostkanal });

/**
 * Meldinger.
 * `authorId`/`readerId` tas aldri fra input — alltid fra sesjonen. Ellers kunne
 * en bruker lest en tråd «som» noen andre ved å sende deres ID.
 */
function toTRPCError(error: unknown): never {
  if (error instanceof NotAParticipantError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: error.message, cause: error });
  }
  if (error instanceof PlatformSupportNotFoundError) {
    throw new TRPCError({ code: 'NOT_FOUND', message: error.message, cause: error });
  }
  if (error instanceof PlatformSupportInvalidTenantError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message, cause: error });
  }
  if (error instanceof PlatformSupportNoDealerAdminError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message, cause: error });
  }
  throw error;
}

export const messagesRouter = router({
  listThreads: protectedProcedure.query(({ ctx }) =>
    meldinger(ctx.db).listThreads(ctx.tenantId, ctx.userId),
  ),

  listMessages: protectedProcedure
    .input(z.object({ threadId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).listMessages(ctx.tenantId, input.threadId, ctx.userId);
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  createThread: protectedProcedure
    .input(
      z.object({
        kind: z.enum(['customer_dealer', 'mechanic_dealer', 'dealer_admin']),
        subject: z.string().max(140).optional(),
        /**
         * Kan være tom (endret ). Oppretteren legges alltid til
         * under, så en tom liste betyr «en tråd med bare meg» — som er en
         * gyldig tråd, og den eneste måten å teste sanntid mot seg selv på.
         * `min(1)` her ville avvist det uten at det gjorde noe tryggere:
         * deltakerne valideres uansett av `createThread` i modulen.
         */
        participantIds: z.array(z.string()).default([]),
        /**
         * Trådens primærkanal = svarkanalen (F6-01).
         * Default `app`: en tråd startet i panelet går i panelet. Velger man
         * SMS eller e-post, sier man at samtalen hører hjemme der — og da må
         * `externalRef` peke på nummeret/adressen svaret skal til.
         */
        channel: z.enum(['app', 'sms', 'email', 'web']).default('app'),
        /** Kundens e-post/telefon. Kroken innkommende meldinger henges på (F6-16). */
        externalRef: z.string().max(320).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      meldinger(ctx.db).createThread({
        tenantId: ctx.tenantId,
        kind: input.kind,
        subject: input.subject,
        channel: input.channel,
        externalRef: input.externalRef ?? null,
        // Den som oppretter tråden er alltid med i den.
        participantIds: [...new Set([...input.participantIds, ctx.userId])],
      }),
    ),

  post: protectedProcedure
    .input(z.object({ threadId: z.uuid(), body: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).postMessage({
          tenantId: ctx.tenantId,
          threadId: input.threadId,
          authorId: ctx.userId,
          body: input.body,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  /**
   * Send en melding som feilet på nytt.
   * Ingen `channel` eller mottaker fra input: alt hentes fra raden og
   * tråden. Ellers kunne en deltaker sendt hvilken som helst melding til
   * hvilken som helst adresse ved å oppgi den selv.
   */
  resend: protectedProcedure
    .input(z.object({ messageId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).resendMessage({
          tenantId: ctx.tenantId,
          messageId: input.messageId,
          readerId: ctx.userId,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ threadId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).markRead(ctx.tenantId, input.threadId, ctx.userId);
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  /**
   * Innboks for Endwise-admin: dealer_admin-tråder fra alle forhandlere.
   * Ikke `listThreads`. Den er tenant-skopet og skal forbli det.
   * Sperren er `endwiseSupportProcedure` (admin + plattform-support). Lesing går via `withPlatformAdmin`
   * + SELECT-only RLS på kind = dealer_admin.
   */
  listPlatformSupport: endwiseSupportProcedure.query(({ ctx }) =>
    meldinger(ctx.db).listPlatformSupportThreads(ctx.userId),
  ),

  listPlatformSupportMessages: endwiseSupportProcedure
    .input(z.object({ threadId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).listPlatformSupportMessages(input.threadId);
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  postPlatformSupport: endwiseSupportProcedure
    .input(z.object({ threadId: z.uuid(), body: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).postPlatformSupportReply({
          threadId: input.threadId,
          authorId: ctx.userId,
          body: input.body,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  markPlatformSupportRead: endwiseSupportProcedure
    .input(z.object({ threadId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).markPlatformSupportRead({
          threadId: input.threadId,
          readerId: ctx.userId,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  /**
   * Ny samtale fra Endwise-innboksen. Skriver på forhandler-tenanten.
   * Ingen tenant-id fra sesjonen; målet kommer fra input og sjekkes mot
   * plattform-lista. dealer_admin/dealer_staff får forbidden her.
   */
  createPlatformSupportThread: endwiseSupportProcedure
    .input(
      z.object({
        tenantId: z.uuid(),
        subject: z.string().max(140).optional(),
        body: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await meldinger(ctx.db).createPlatformSupportThread({
          tenantId: input.tenantId,
          authorId: ctx.userId,
          subject: input.subject,
          body: input.body,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),
});
