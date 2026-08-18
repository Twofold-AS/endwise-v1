import { createMessagesModule, NotAParticipantError } from '@endwise/modules/messages';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F6-01 — Meldinger.
 *
 * `authorId`/`readerId` tas ALDRI fra input — alltid fra sesjonen. Ellers kunne
 * en bruker lest en tråd «som» noen andre ved å sende deres ID.
 */
function toTRPCError(error: unknown): never {
  if (error instanceof NotAParticipantError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: error.message, cause: error });
  }
  throw error;
}

export const messagesRouter = router({
  listThreads: protectedProcedure.query(({ ctx }) =>
    createMessagesModule(ctx.db).listThreads(ctx.tenantId, ctx.userId),
  ),

  listMessages: protectedProcedure
    .input(z.object({ threadId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await createMessagesModule(ctx.db).listMessages(
          ctx.tenantId,
          input.threadId,
          ctx.userId,
        );
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
         * Kan være TOM (endret 07.08.2026). Oppretteren legges alltid til
         * under, så en tom liste betyr «en tråd med bare meg» — som er en
         * gyldig tråd, og den eneste måten å teste sanntid mot seg selv på.
         * `min(1)` her ville avvist det uten at det gjorde noe tryggere:
         * deltakerne valideres uansett av `createThread` i modulen.
         */
        participantIds: z.array(z.string()).default([]),
        /**
         * Trådens primærkanal = SVARKANALEN (F6-01, 08.08.2026).
         *
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
      createMessagesModule(ctx.db).createThread({
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
        return await createMessagesModule(ctx.db).postMessage({
          tenantId: ctx.tenantId,
          threadId: input.threadId,
          authorId: ctx.userId,
          body: input.body,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ threadId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createMessagesModule(ctx.db).markRead(
          ctx.tenantId,
          input.threadId,
          ctx.userId,
        );
      } catch (error) {
        return toTRPCError(error);
      }
    }),
});
