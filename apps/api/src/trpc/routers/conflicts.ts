import { ConflictError, createConflictService } from '@endwise/modules/quick';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { moduleAdminProcedure, router } from '../init.ts';

/**
 * Modul-gate: `quick`. Synk-konflikter oppstår av Quick-synken;
 * uten modulen finnes de ikke, og ruta skal ikke svare.
 */
const quickAdminProcedure = moduleAdminProcedure('quick');

/**
 * F8-01 / F8-02 — Synk-konflikter (tre-veis fletting).
 * Sikkerhet: `adminProcedure` (kun dealer_admin/endwise_admin) + `withTenant` →
 * RLS. Forhandler A ser eller løser aldri B sine konflikter — verken via rolle
 * eller RLS.
 */
export const conflictsRouter = router({
  /** Åpne konflikter for tenanten. */
  list: quickAdminProcedure.query(({ ctx }) =>
    createConflictService(ctx.db).listOpen(ctx.tenantId),
  ),

  /** Antall åpne konflikter (til badge). */
  count: quickAdminProcedure.query(({ ctx }) =>
    createConflictService(ctx.db).openCount(ctx.tenantId),
  ),

  /**
   * Løs en konflikt: 'quick' (behold Quick) eller 'local' (behold vår).
   * «behold vår» registrerer push-intensjon (push er fortsatt gated).
   */
  resolve: quickAdminProcedure
    .input(z.object({ conflictId: z.uuid(), resolution: z.enum(['quick', 'local']) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await createConflictService(ctx.db).resolve(ctx.tenantId, {
          conflictId: input.conflictId,
          resolution: input.resolution,
          userId: ctx.userId,
        });
        return { ok: true };
      } catch (error) {
        if (error instanceof ConflictError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),
});
