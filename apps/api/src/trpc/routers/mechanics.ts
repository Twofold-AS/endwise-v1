import { schema, withTenant } from '@endwise/db';
import { createRuleMatcher } from '@endwise/modules/matching';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

export const mechanicsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, (tx) => tx.select().from(schema.mechanics)),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        capacity: z.number().int().min(1).max(10).default(1),
        // Ferdigheter settes IKKE her. De hører til kompetanseregisteret (F3-12)
        // — competence.setMechanicSkill — som har rolle-gate og sertifisering.
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.mechanics)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return created;
      }),
    ),

  /**
   * F3-02 — Hvem kan ta denne jobben?
   *
   * Returnerer en RANGERT liste, ikke ett svar. Booking-motoren (F3-01) eier
   * valget og slot-låsen — matcheren skal aldri kunne dobbeltbooke noen.
   */
  match: protectedProcedure
    .input(
      z.object({
        serviceId: z.uuid(),
        requiredSkills: z.array(z.string()).default([]),
        from: z.coerce.date(),
        to: z.coerce.date(),
        vehicleId: z.uuid().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      createRuleMatcher(ctx.db).match({ ...input, tenantId: ctx.tenantId }),
    ),
});
