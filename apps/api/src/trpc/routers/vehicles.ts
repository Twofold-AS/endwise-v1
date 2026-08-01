import { eq, schema, withTenant } from '@endwise/db';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

const vehicleType = z.enum(['mc', 'boat', 'atv']);

/** F2-01 — Kjøretøyregister. Vegvesen-oppslaget (F2-08) ligger i lookup-ruteren. */
export const vehiclesRouter = router({
  list: protectedProcedure
    .input(z.object({ customerId: z.uuid().optional() }))
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) => {
        const query = tx.select().from(schema.vehicles);
        return input.customerId
          ? query.where(eq(schema.vehicles.customerId, input.customerId))
          : query;
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        type: vehicleType,
        regNumber: z.string().min(2).max(10).optional(),
        customerId: z.uuid().optional(),
        // Feltene under fylles normalt av Vegvesen-oppslaget. Manuell inntasting
        // er tillatt for båt/ATV, som ofte ikke finnes i Autosys.
        make: z.string().optional(),
        model: z.string().optional(),
        modelYear: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.vehicles)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return created;
      }),
    ),

  assignCustomer: protectedProcedure
    .input(z.object({ vehicleId: z.uuid(), customerId: z.uuid().nullable() }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [updated] = await tx
          .update(schema.vehicles)
          .set({ customerId: input.customerId, updatedAt: new Date() })
          .where(eq(schema.vehicles.id, input.vehicleId))
          .returning();
        return updated;
      }),
    ),
});
