import {
  and,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  schema,
  withTenant,
} from '@endwise/db';
import {
  createBooking,
  formatServiceNames,
  InvalidTransitionError,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  SlotConflictError,
  type TenantTx,
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
 * mechanic.myDay. Left join der feltet er valgfritt (kunde/kjøretøy), inner der
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

type JobLine = {
  serviceVersionId: string;
  name: string | null;
  version: number;
  durationMinutes: number;
  priceMinor: number | null;
};

async function attachJobLines<
  T extends {
    id: string;
    serviceName: string | null;
    serviceVersionId: string;
    serviceVersion: number;
    durationMinutes: number;
    priceMinor: number | null;
  },
>(tx: TenantTx, rows: T[]) {
  if (rows.length === 0) return [];
  const lines = await tx
    .select({
      bookingId: schema.bookingServices.bookingId,
      serviceVersionId: schema.bookingServices.serviceVersionId,
      durationMinutes: schema.bookingServices.durationMinutes,
      name: schema.services.name,
      version: schema.serviceVersions.version,
      priceMinor: schema.serviceVersions.priceMinor,
    })
    .from(schema.bookingServices)
    .innerJoin(
      schema.serviceVersions,
      eq(schema.serviceVersions.id, schema.bookingServices.serviceVersionId),
    )
    .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
    .where(
      inArray(
        schema.bookingServices.bookingId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(schema.bookingServices.sortOrder);

  const byBooking = new Map<string, JobLine[]>();
  for (const line of lines) {
    const list = byBooking.get(line.bookingId) ?? [];
    list.push({
      serviceVersionId: line.serviceVersionId,
      name: line.name,
      version: line.version,
      durationMinutes: line.durationMinutes,
      priceMinor: line.priceMinor,
    });
    byBooking.set(line.bookingId, list);
  }

  return rows.map((r) => {
    const services: JobLine[] =
      byBooking.get(r.id) ??
      (r.serviceVersionId
        ? [
            {
              serviceVersionId: r.serviceVersionId,
              name: r.serviceName,
              version: r.serviceVersion,
              durationMinutes: r.durationMinutes,
              priceMinor: r.priceMinor,
            },
          ]
        : []);
    const names = services.map((s) => s.name).filter((n): n is string => Boolean(n));
    return {
      ...r,
      services,
      serviceNames: names,
      serviceName: formatServiceNames(names.length > 0 ? names : [r.serviceName]),
    };
  });
}

export const bookingsRouter = router({
  /** F3-11 / F3-09 — Internt jobb-inntak. Flere tjenester + manuell varighet. */
  create: protectedProcedure
    .input(
      z.object({
        mechanicId: z.uuid(),
        serviceVersionId: z.uuid(),
        extraServiceVersionIds: z.array(z.uuid()).max(20).default([]),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        durationMinutes: z
          .number()
          .int()
          .min(MIN_DURATION_MINUTES)
          .max(MAX_DURATION_MINUTES)
          .optional(),
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
   * Bookingliste (forhandler). RLS-scopet til innlogget tenant.
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
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
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
        const rows = await tx
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
        return attachJobLines(tx, rows);
      }),
    ),

  /** Detalj: beriket booking + append-only historikk (audit-loggen). */
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
      const [enriched] = await attachJobLines(tx, [booking]);
      if (!enriched) return null;

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

      return { ...enriched, history };
    }),
  ),

  /**
   * F3-03 / F3-07 — Kalender: bookinger som overlapper et tidsvindu.
   * Beriket. Ruta returnerte tidligere rå
   * `bookings`-rader (`listBookings` i booking-motoren). Det holdt for et API,
   * men ikke for en kalender: en kloss uten regnr, tjeneste og mekaniker er et
   * farget rektangel. Nå brukes samme `enrichedColumns` som `list`, så begge
   * visningene av samme data faktisk viser det samme.
   * Overlapp-vinduet er `startsAt < to AND endsAt > from` — ikke `startsAt`
   * mellom fra og til. En jobb som begynte i går kl. 16 og varer til i dag skal
   * være med i dagens kalender; ellers forsvinner den nettopp den dagen den er
   * i veien.
   */
  calendar: protectedProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
        mechanicId: z.uuid().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const rows = await tx
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
          .where(
            and(
              lt(schema.bookings.startsAt, input.to),
              gt(schema.bookings.endsAt, input.from),
              input.mechanicId ? eq(schema.bookings.mechanicId, input.mechanicId) : undefined,
            ),
          )
          .orderBy(schema.bookings.startsAt);
        return attachJobLines(tx, rows);
      }),
    ),
});
