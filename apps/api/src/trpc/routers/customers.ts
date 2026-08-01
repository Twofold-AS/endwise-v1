import { desc, eq, schema, withTenant } from '@endwise/db';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/** F2-06 — Kunderegister. Alle spørringer går gjennom withTenant → RLS. */
export const customersRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx.select().from(schema.customers).limit(input.limit),
      ),
    ),

  byId: protectedProcedure.input(z.object({ id: z.uuid() })).query(({ ctx, input }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [customer] = await tx
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, input.id))
        .limit(1);
      if (!customer) return null;

      const notes = await tx
        .select()
        .from(schema.customerNotes)
        .where(eq(schema.customerNotes.customerId, input.id))
        .orderBy(desc(schema.customerNotes.createdAt));

      return { ...customer, notes };
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.email().optional(),
        phone: z.string().min(3).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.customers)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return created;
      }),
    ),

  addNote: protectedProcedure
    .input(z.object({ customerId: z.uuid(), body: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [note] = await tx
          .insert(schema.customerNotes)
          .values({ ...input, tenantId: ctx.tenantId, authorId: ctx.userId })
          .returning();
        return note;
      }),
    ),
});
