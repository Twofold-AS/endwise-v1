import { and, asc, desc, eq, ilike, or, schema, withTenant } from '@endwise/db';
import { z } from 'zod';
import { protectedProcedure, router, staffProcedure } from '../init.ts';
import { loggDealerWritePostgresFeil, mapDealerWritePostgresFeil } from '../slett-postgres.ts';

const vehicleType = z.enum(['mc', 'boat', 'atv']);

/**
 * F2-01 / F5-03 — Kjøretøyregister. Vegvesen-oppslaget (F2-08) ligger i
 * lookup-ruteren; her speiles bare resultatet.
 * Feltene `make`/`model`/`modelYear`/`vin`/`inspectionDue` er speilet fra
 * Autosys, ikke vår sannhet. De skrives av oppslaget, ikke for hånd — unntatt
 * for båt og atv, som ofte ikke finnes i registeret i det hele tatt.
 */
export const vehiclesRouter = router({
  /**
   * Kjøretøyliste med søk på **regnr og understellsnummer**. Det er de to
   * tingene man har når kjøretøyet står foran deg og eieren ikke gjør det.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          customerId: z.uuid().optional(),
          sok: z.string().max(64).optional(),
          type: z.enum(['alle', 'mc', 'boat', 'atv']).default('alle'),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .default({ type: 'alle', limit: 100 }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) => {
        const q = input.sok?.trim();
        return tx
          .select({
            id: schema.vehicles.id,
            type: schema.vehicles.type,
            regNumber: schema.vehicles.regNumber,
            make: schema.vehicles.make,
            model: schema.vehicles.model,
            modelYear: schema.vehicles.modelYear,
            vin: schema.vehicles.vin,
            inspectionDue: schema.vehicles.inspectionDue,
            lookupAt: schema.vehicles.lookupAt,
            customerId: schema.vehicles.customerId,
            // Eiernavnet rett i lista — uten det er en regnr-liste bare kodetall.
            customerName: schema.customers.name,
          })
          .from(schema.vehicles)
          .leftJoin(schema.customers, eq(schema.customers.id, schema.vehicles.customerId))
          .where(
            and(
              eq(schema.vehicles.tenantId, ctx.tenantId),
              input.customerId ? eq(schema.vehicles.customerId, input.customerId) : undefined,
              input.type === 'alle' ? undefined : eq(schema.vehicles.type, input.type),
              q
                ? or(
                    ilike(schema.vehicles.regNumber, `%${q}%`),
                    ilike(schema.vehicles.vin, `%${q}%`),
                    ilike(schema.vehicles.make, `%${q}%`),
                    ilike(schema.vehicles.model, `%${q}%`),
                  )
                : undefined,
            ),
          )
          .orderBy(asc(schema.vehicles.regNumber))
          .limit(input.limit);
      }),
    ),

  /** Kjøretøykortet: data, eier og servicehistorikk i ett kall. */
  byId: protectedProcedure.input(z.object({ id: z.uuid() })).query(({ ctx, input }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [kjoretoy] = await tx
        .select()
        .from(schema.vehicles)
        // CWE-639: id og tenant.
        .where(and(eq(schema.vehicles.id, input.id), eq(schema.vehicles.tenantId, ctx.tenantId)))
        .limit(1);
      if (!kjoretoy) return null;

      const eier = kjoretoy.customerId
        ? (
            await tx
              .select({
                id: schema.customers.id,
                name: schema.customers.name,
                email: schema.customers.email,
                phone: schema.customers.phone,
              })
              .from(schema.customers)
              .where(
                and(
                  eq(schema.customers.id, kjoretoy.customerId),
                  eq(schema.customers.tenantId, ctx.tenantId),
                ),
              )
          )[0]
        : null;

      const saker = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          notes: schema.bookings.notes,
          serviceName: schema.services.name,
          mechanicName: schema.mechanics.name,
          priceMinor: schema.serviceVersions.priceMinor,
        })
        .from(schema.bookings)
        .leftJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .leftJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
        .where(
          and(eq(schema.bookings.vehicleId, input.id), eq(schema.bookings.tenantId, ctx.tenantId)),
        )
        .orderBy(desc(schema.bookings.startsAt))
        .limit(100);

      return { ...kjoretoy, eier: eier ?? null, saker };
    }),
  ),

  create: staffProcedure
    .input(
      z.object({
        type: vehicleType,
        regNumber: z.string().min(2).max(10).optional(),
        customerId: z.uuid().optional(),
        // Feltene under fylles normalt av Vegvesen-oppslaget. Manuell inntasting
        // er tillatt for båt/atv, som ofte ikke finnes i Autosys.
        make: z.string().max(64).optional(),
        model: z.string().max(64).optional(),
        modelYear: z.string().max(8).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [created] = await tx
            .insert(schema.vehicles)
            .values({ ...input, tenantId: ctx.tenantId })
            .returning();
          return created;
        });
      } catch (error) {
        loggDealerWritePostgresFeil('vehicles', error);
        throw mapDealerWritePostgresFeil(error, 'Kunne ikke lagre kjøretøyet. Prøv igjen.');
      }
    }),

  assignCustomer: protectedProcedure
    .input(z.object({ vehicleId: z.uuid(), customerId: z.uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [oppdatert] = await tx
            .update(schema.vehicles)
            .set({ customerId: input.customerId })
            .where(
              and(
                eq(schema.vehicles.id, input.vehicleId),
                eq(schema.vehicles.tenantId, ctx.tenantId),
              ),
            )
            .returning();
          return oppdatert;
        });
      } catch (error) {
        loggDealerWritePostgresFeil('vehicles', error);
        throw mapDealerWritePostgresFeil(error, 'Kunne ikke lagre kjøretøyet. Prøv igjen.');
      }
    }),
});
