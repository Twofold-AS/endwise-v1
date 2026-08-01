import { and, asc, eq, gte, lt, schema, sql, withTenant } from '@endwise/db';
import { publishEvent } from '@endwise/modules/stream';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

function dayWindow(dateISO?: string): { from: Date; to: Date } {
  const base = dateISO ? new Date(dateISO) : new Date();
  const from = new Date(base);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

/**
 * F7 — Mekanikerens «Min dag». Alt scopet til den INNLOGGEDE mekanikeren:
 * mechanicId utledes fra `mechanics.userId = ctx.userId`, aldri fra input →
 * ingen mekaniker kan be om en annens kø. RLS gjør at kun egen tenant er synlig.
 */
export const mechanicRouter = router({
  myProfile: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [m] = await tx
        .select()
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId));
      return m ?? null;
    }),
  ),

  myDay: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [m] = await tx
          .select()
          .from(schema.mechanics)
          .where(eq(schema.mechanics.userId, ctx.userId));
        if (!m) return { mechanic: null, jobs: [] as MyDayJob[] };
        const { from, to } = dayWindow(input?.date);
        const jobs = await tx
          .select({
            id: schema.bookings.id,
            status: schema.bookings.status,
            startsAt: schema.bookings.startsAt,
            endsAt: schema.bookings.endsAt,
            notes: schema.bookings.notes,
            regNumber: schema.vehicles.regNumber,
            vehicleType: schema.vehicles.type,
            customerName: schema.customers.name,
          })
          .from(schema.bookings)
          .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
          .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
          .where(
            and(
              eq(schema.bookings.mechanicId, m.id),
              gte(schema.bookings.startsAt, from),
              lt(schema.bookings.startsAt, to),
            ),
          )
          .orderBy(asc(schema.bookings.startsAt));
        return { mechanic: m, jobs };
      }),
    ),

  /**
   * F7-05 — Meld avvik på en jobb → sanntidsvarsel til selger.
   *
   * Scoping: mekanikeren kan KUN melde avvik på SIN egen jobb (bookingId må ha
   * `mechanicId = min mekaniker-id`); ellers NOT_FOUND. RLS holder tenant-grensen.
   * Avviket lagres på bookingen (notat) og et innholdsløst SSE-event publiseres
   * (F6-02-regelen: aldri innhold i NOTIFY-payloaden).
   */
  reportDeviation: protectedProcedure
    .input(z.object({ bookingId: z.uuid(), message: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [m] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.userId, ctx.userId));
        if (!m) throw new TRPCError({ code: 'FORBIDDEN', message: 'Ikke en mekaniker' });

        const [b] = await tx
          .select({ mechanicId: schema.bookings.mechanicId, notes: schema.bookings.notes })
          .from(schema.bookings)
          .where(eq(schema.bookings.id, input.bookingId));
        if (!b || b.mechanicId !== m.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke jobben din' });
        }

        const line = `[AVVIK ${new Date().toLocaleString('nb-NO')}] ${input.message}`;
        await tx
          .update(schema.bookings)
          .set({ notes: b.notes ? `${b.notes}\n${line}` : line, updatedAt: sql`now()` })
          .where(eq(schema.bookings.id, input.bookingId));
      });

      // Sanntidsvarsel til selger (innholdsløst — kun «se på denne bookingen»).
      await publishEvent(ctx.db, {
        tenantId: ctx.tenantId,
        type: 'booking.deviation',
        payload: { bookingId: input.bookingId },
        subjectId: input.bookingId,
      });
      return { ok: true };
    }),

  myCertifications: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [m] = await tx
        .select()
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId));
      if (!m) return [];
      return tx
        .select({
          skillKey: schema.mechanicSkills.skillKey,
          level: schema.mechanicSkills.level,
          certificationExpiresAt: schema.mechanicSkills.certificationExpiresAt,
        })
        .from(schema.mechanicSkills)
        .where(eq(schema.mechanicSkills.mechanicId, m.id));
    }),
  ),
});

type MyDayJob = {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  regNumber: string | null;
  vehicleType: string | null;
  customerName: string | null;
};
