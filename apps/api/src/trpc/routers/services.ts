import { and, desc, eq, isNull, schema, withTenant } from '@endwise/db';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

const vehicleType = z.enum(['mc', 'boat', 'atv']);

/**
 * F2-04 — Tjenestekatalog, versjonert.
 *
 * `update` LAGER EN NY VERSJON. Den endrer aldri en eksisterende, fordi
 * bookinger fra i fjor peker på versjonen som gjaldt da. Endrer du prisen i dag,
 * skal fjorårets faktura fortsatt stemme.
 */
export const servicesRouter = router({
  /** Gjeldende versjon av hver aktive tjeneste. */
  list: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select({
          id: schema.services.id,
          name: schema.services.name,
          vehicleType: schema.services.vehicleType,
          active: schema.services.active,
          // Bookinger peker på VERSJONEN (F2-04) — createBooking trenger denne.
          serviceVersionId: schema.serviceVersions.id,
          version: schema.serviceVersions.version,
          durationMinutes: schema.serviceVersions.durationMinutes,
          priceMinor: schema.serviceVersions.priceMinor,
          skills: schema.serviceVersions.skills,
        })
        .from(schema.services)
        .innerJoin(
          schema.serviceVersions,
          and(
            eq(schema.serviceVersions.serviceId, schema.services.id),
            isNull(schema.serviceVersions.validTo),
          ),
        )
        .where(eq(schema.services.active, true)),
    ),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        vehicleType,
        durationMinutes: z
          .number()
          .int()
          .min(5)
          .max(8 * 60),
        priceMinor: z.number().int().min(0).optional(),
        skills: z.array(z.string()).default([]),
        description: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [service] = await tx
          .insert(schema.services)
          .values({ tenantId: ctx.tenantId, name: input.name, vehicleType: input.vehicleType })
          .returning();
        if (!service) throw new Error('Kunne ikke opprette tjeneste');

        const [version] = await tx
          .insert(schema.serviceVersions)
          .values({
            tenantId: ctx.tenantId,
            serviceId: service.id,
            version: 1,
            durationMinutes: input.durationMinutes,
            priceMinor: input.priceMinor ?? null,
            skills: input.skills,
            description: input.description ?? null,
          })
          .returning();

        return { service, version };
      }),
    ),

  /** Ny versjon. Den forrige lukkes med `validTo` — den slettes ikke. */
  update: protectedProcedure
    .input(
      z.object({
        serviceId: z.uuid(),
        durationMinutes: z
          .number()
          .int()
          .min(5)
          .max(8 * 60),
        priceMinor: z.number().int().min(0).optional(),
        skills: z.array(z.string()).default([]),
        description: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [current] = await tx
          .select()
          .from(schema.serviceVersions)
          .where(eq(schema.serviceVersions.serviceId, input.serviceId))
          .orderBy(desc(schema.serviceVersions.version))
          .limit(1);
        if (!current) throw new Error('Tjenesten finnes ikke');

        const now = new Date();
        await tx
          .update(schema.serviceVersions)
          .set({ validTo: now })
          .where(eq(schema.serviceVersions.id, current.id));

        const [next] = await tx
          .insert(schema.serviceVersions)
          .values({
            tenantId: ctx.tenantId,
            serviceId: input.serviceId,
            version: current.version + 1,
            durationMinutes: input.durationMinutes,
            priceMinor: input.priceMinor ?? null,
            skills: input.skills,
            description: input.description ?? null,
            validFrom: now,
          })
          .returning();

        return next;
      }),
    ),

  /** Deaktiver — aldri slett. Historikken skal overleve. */
  deactivate: protectedProcedure
    .input(z.object({ serviceId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .update(schema.services)
          .set({ active: false })
          .where(eq(schema.services.id, input.serviceId)),
      ),
    ),
});
