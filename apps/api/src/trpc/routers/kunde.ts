import { and, desc, eq, schema, withCustomer, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { customerProcedure, router } from '../init.ts';

async function finnKunde(ctx: {
  db: Parameters<typeof withTenant>[0];
  tenantId: string;
  userId: string;
}) {
  const [rad] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
    tx
      .select({
        id: schema.customers.id,
        navn: schema.customers.name,
        epost: schema.customers.email,
        telefon: schema.customers.phone,
      })
      .from(schema.customers)
      .where(
        and(eq(schema.customers.tenantId, ctx.tenantId), eq(schema.customers.userId, ctx.userId)),
      )
      .limit(1),
  );
  if (!rad) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Ingen kundeside her' });
  }
  return rad;
}

export const kundeRouter = router({
  meg: customerProcedure.query(async ({ ctx }) => {
    return finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
  }),

  bookinger: customerProcedure.query(async ({ ctx }) => {
    const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return withCustomer(ctx.db, ctx.tenantId, kunde.id, (tx) =>
      tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          endsAt: schema.bookings.endsAt,
          vehicleId: schema.bookings.vehicleId,
        })
        .from(schema.bookings)
        .where(
          and(eq(schema.bookings.tenantId, ctx.tenantId), eq(schema.bookings.customerId, kunde.id)),
        )
        .orderBy(desc(schema.bookings.startsAt)),
    );
  }),

  kjoretoy: customerProcedure.query(async ({ ctx }) => {
    const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return withCustomer(ctx.db, ctx.tenantId, kunde.id, async (tx) => {
      const biler = await tx
        .select({
          id: schema.vehicles.id,
          type: schema.vehicles.type,
          regNumber: schema.vehicles.regNumber,
          make: schema.vehicles.make,
          model: schema.vehicles.model,
          modelYear: schema.vehicles.modelYear,
        })
        .from(schema.vehicles)
        .where(
          and(eq(schema.vehicles.tenantId, ctx.tenantId), eq(schema.vehicles.customerId, kunde.id)),
        );
      const historikk = await tx
        .select({
          id: schema.bookings.id,
          vehicleId: schema.bookings.vehicleId,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
        })
        .from(schema.bookings)
        .where(
          and(eq(schema.bookings.tenantId, ctx.tenantId), eq(schema.bookings.customerId, kunde.id)),
        )
        .orderBy(desc(schema.bookings.startsAt));
      return biler.map((b) => ({
        ...b,
        historikk: historikk.filter((h) => h.vehicleId === b.id).slice(0, 8),
      }));
    });
  }),
});
