import { envelopeCryptoConfigured } from '@endwise/db';
import { createVegvesenConfigService } from '@endwise/modules/vegvesen';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { moduleAdminProcedure, moduleProcedure, router } from '../init.ts';

/** Modul-gate: `vegvesen`. */
const vegvesenProcedure = moduleProcedure('vegvesen');
const vegvesenAdminProcedure = moduleAdminProcedure('vegvesen');

/**
 * Vegvesen-API-nøkkel per forhandler.
 * `config` returnerer kun `hasKey`. Nøkkelen forlater aldri serveren,
 * logges ikke, og sendes ikke til klienten.
 */
export const vegvesenRouter = router({
  config: vegvesenProcedure.query(({ ctx }) =>
    createVegvesenConfigService(ctx.db).getView(ctx.tenantId),
  ),

  setKey: vegvesenAdminProcedure
    .input(z.object({ nokkel: z.string().trim().min(8).max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (!envelopeCryptoConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ENDWISE_KEK mangler — kan ikke kryptere Vegvesen-nøkkelen.',
        });
      }
      await createVegvesenConfigService(ctx.db).set(ctx.tenantId, input.nokkel);
      return { ok: true as const, hasKey: true as const };
    }),
});
