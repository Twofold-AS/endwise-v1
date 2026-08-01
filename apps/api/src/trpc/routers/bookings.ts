import { and, desc, eq, gte, ilike, lte, or, schema, withTenant } from '@endwise/db';
import {
  createBooking,
  InvalidTransitionError,
  listBookings,
  SlotConflictError,
  transitionBooking,
} from '@endwise/modules/booking';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

const status = z.enum(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);

/** Domenefeil → riktig HTTP-kode. 409 for slot-konflikt: klienten kan prøve et annet tidspunkt. */
function toTRPCError(error: unknown): never {
  if (error instanceof SlotConflictError) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message, cause: error });
  }
  if (error instanceof InvalidTransitionError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message, cause: error });
  }
  throw error;
}

/**
 * Beriket rad (navn, ikke bare IDer) for liste + detalj. Samme join-mønster som
 * mechanic.myDay. LEFT join der feltet er valgfritt (kunde/kjøretøy), INNER der
 * det er obligatorisk (mekaniker + tjenesteversjon).
 */
const enrichedColumns = {
  id: schema.bookings.id,
  status: schema.bookings.status,
  source: schema.bookings.source,
  startsAt: schema.bookings.startsAt,
  endsAt: schema.bookings.endsAt,
  notes: schema.bookings.notes,
  createdAt: schema.bookings.createdAt,
  updatedAt: schema.bookings.updatedAt,
  customerId: schema.bookings.customerId,
  customerName: schema.customers.name,
  vehicleId: schema.bookings.vehicleId,
  regNumber: schema.vehicles.regNumber,
  vehicleType: schema.vehicles.type,
  make: schema.vehicles.make,
  model: schema.vehicles.model,
  mechanicId: schema.bookings.mechanicId,
  mechanicName: schema.mechanics.name,
  serviceVersionId: schema.bookings.serviceVersionId,
  serviceName: schema.services.name,
  serviceVersion: schema.serviceVersions.version,
  durationMinutes: schema.serviceVersions.durationMinutes,
  priceMinor: schema.serviceVersions.priceMinor,
} as const;

export const bookingsRouter = router({
  /** F3-11 — Internt booking-inntak: admin-API. Nå også «Ny booking»-flyten. */
  create: protectedProcedure
    .input(
      z.object({
        mechanicId: z.uuid(),
        serviceVersionId: z.uuid(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        customerId: z.uuid().optional(),
        vehicleId: z.uuid().optional(),
        notes: z.string().optional(),
        source: z.enum(['widget', 'admin', 'quick', 'api']).default('admin'),
        idempotencyKey: z.string().min(8).max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBooking(ctx.db, { ...input, tenantId: ctx.tenantId });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  transition: protectedProcedure
    .input(z.object({ bookingId: z.uuid(), to: status }))
    .mutation(async ({ ctx, input }) => {
      try {
        // ctx.userId → audit-loggens actor (F1-06). Gjelder også «Min dag».
        return await transitionBooking(ctx.db, ctx.tenantId, input.bookingId, input.to, ctx.userId);
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  /**
   * F3-06 — Bookingliste (forhandler). RLS-scopet til innlogget tenant.
   * Filtre: status, mekaniker, dato-vindu, fritekst (kunde/regnr/notat). Beriket.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: status.optional(),
          mechanicId: z.uuid().optional(),
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
          search: z.string().trim().max(80).optional(),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .default({ limit: 100 }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) => {
        const conditions = [];
        if (input.status) conditions.push(eq(schema.bookings.status, input.status));
        if (input.mechanicId) conditions.push(eq(schema.bookings.mechanicId, input.mechanicId));
        if (input.from) conditions.push(gte(schema.bookings.startsAt, input.from));
        if (input.to) conditions.push(lte(schema.bookings.startsAt, input.to));
        if (input.search) {
          const q = `%${input.search}%`;
          const term = or(
            ilike(schema.customers.name, q),
            ilike(schema.vehicles.regNumber, q),
            ilike(schema.bookings.notes, q),
          );
          if (term) conditions.push(term);
        }
        return tx
          .select(enrichedColumns)
          .from(schema.bookings)
          .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
          .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
          .innerJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
          .innerJoin(
            schema.serviceVersions,
            eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
          )
          .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(schema.bookings.startsAt))
          .limit(input.limit);
      }),
    ),

  /** F3-06 — Detalj: beriket booking + append-only historikk (audit-loggen). */
  byId: protectedProcedure.input(z.object({ id: z.uuid() })).query(({ ctx, input }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [booking] = await tx
        .select(enrichedColumns)
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
        .innerJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
        .innerJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .where(eq(schema.bookings.id, input.id))
        .limit(1);
      if (!booking) return null;

      const history = await tx
        .select({
          id: schema.auditLog.id,
          actor: schema.auditLog.actor,
          action: schema.auditLog.action,
          metadata: schema.auditLog.metadata,
          occurredAt: schema.auditLog.occurredAt,
        })
        .from(schema.auditLog)
        .where(
          and(eq(schema.auditLog.subjectType, 'booking'), eq(schema.auditLog.subjectId, input.id)),
        )
        .orderBy(desc(schema.auditLog.occurredAt));

      return { ...booking, history };
    }),
  ),

  /** F3-03 — Kalender-API (rå rader i et tidsvindu). */
  calendar: protectedProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
        mechanicId: z.uuid().optional(),
      }),
    )
    .query(({ ctx, input }) => listBookings(ctx.db, ctx.tenantId, input)),
});
