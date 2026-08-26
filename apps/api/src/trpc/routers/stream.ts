import { headEventId, readEventsSince } from '@endwise/modules/stream';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * Poll-reserve for sanntidskanalen.
 * SSE (`apps/stream`) er den raske veien. Hvis den er nede, eller Vercel-rewriten
 * buffer strømmen, leser klienten `stream_events` her hvert 8.–15. sekund og
 * oppfrisker samme cache som et live-event ville gjort. Innholdet hentes fortsatt
 * gjennom tRPC/RLS etterpå — denne ruta leverer bare «hva skjedde + id».
 */
export const streamRouter = router({
  /** Høyeste id tenanten kan se. Start-cursor, ikke avspilling. */
  head: protectedProcedure.query(async ({ ctx }) => ({
    lastEventId: await headEventId(ctx.db, ctx.tenantId),
  })),

  since: protectedProcedure
    .input(z.object({ lastEventId: z.number().int().min(0) }))
    .query(async ({ ctx, input }) => {
      const events = await readEventsSince(ctx.db, ctx.tenantId, input.lastEventId, ctx.userId, 50);
      return events.map((e) => ({
        id: e.id,
        type: e.type,
        subjectId: e.subjectId,
        payload: e.payload,
      }));
    }),
});
