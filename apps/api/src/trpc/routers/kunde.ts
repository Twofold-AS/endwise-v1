import { and, desc, eq, gte, schema, withCustomer, withTenant } from '@endwise/db';
import {
  IngenInnboksMottakerError,
  jobbFase,
  KUNDE_MELDING_PER_MINUTT,
  kundeButikkStatus,
  sendKundeMelding,
} from '@endwise/modules/kunde';
import {
  createWidgetPublicService,
  WidgetBookingError,
  WidgetBookingIdentity,
  widgetWorkingDay,
} from '@endwise/modules/widget';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
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

function toTRPCError(error: unknown): never {
  if (error instanceof WidgetBookingError) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message, cause: error });
  }
  if (error instanceof IngenInnboksMottakerError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message, cause: error });
  }
  if (error instanceof TRPCError) throw error;
  if (error instanceof Error && error.message.startsWith('Skriv')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
  }
  if (error instanceof Error && error.message.startsWith('Meldingen kan')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Kunne ikke fullføre' });
}

export const kundeRouter = router({
  meg: customerProcedure.query(async ({ ctx }) => {
    return finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
  }),

  bookinger: customerProcedure.query(async ({ ctx }) => {
    const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return withCustomer(ctx.db, ctx.tenantId, kunde.id, async (tx) => {
      const rader = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          endsAt: schema.bookings.endsAt,
          vehicleId: schema.bookings.vehicleId,
          tjeneste: schema.services.name,
        })
        .from(schema.bookings)
        .leftJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .where(
          and(eq(schema.bookings.tenantId, ctx.tenantId), eq(schema.bookings.customerId, kunde.id)),
        )
        .orderBy(desc(schema.bookings.startsAt));
      return rader.map((b) => ({ ...b, fase: jobbFase(b.status) }));
    });
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
        historikk: historikk
          .filter((h) => h.vehicleId === b.id)
          .slice(0, 8)
          .map((h) => ({ ...h, fase: jobbFase(h.status) })),
      }));
    });
  }),

  tjenester: customerProcedure.query(async ({ ctx }) => {
    await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return createWidgetPublicService(ctx.db).listServices(ctx.tenantId);
  }),

  ledigeTider: customerProcedure
    .input(
      z.object({
        serviceVersionId: z.uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
      const { dayStart, dayEnd } = widgetWorkingDay(input.date);
      const slots = await createWidgetPublicService(ctx.db).availableSlots(ctx.tenantId, {
        serviceVersionId: input.serviceVersionId,
        dayStart,
        dayEnd,
        notBefore: new Date(),
      });
      return slots.map((s) => s.toISOString());
    }),

  bestill: customerProcedure
    .input(
      z.object({
        serviceVersionId: z.uuid(),
        startsAt: z.coerce.date(),
        vehicleId: z.uuid().optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
      try {
        const result = await createWidgetPublicService(ctx.db).createPortalBookingRequest(
          ctx.tenantId,
          {
            customerId: kunde.id,
            serviceVersionId: input.serviceVersionId,
            startsAt: input.startsAt,
            vehicleId: input.vehicleId ?? null,
            notes: input.notes ?? null,
            idempotencyKey: WidgetBookingIdentity.idempotencyKey({
              cid: `portal:${kunde.id}`,
              serviceVersionId: input.serviceVersionId,
              startsAt: input.startsAt,
            }),
          },
        );
        return { ...result, fase: jobbFase(result.status) };
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  traader: customerProcedure.query(async ({ ctx }) => {
    const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return withCustomer(ctx.db, ctx.tenantId, kunde.id, (tx) =>
      tx
        .select({
          id: schema.threads.id,
          subject: schema.threads.subject,
          lastMessageAt: schema.threads.lastMessageAt,
        })
        .from(schema.threads)
        .where(
          and(
            eq(schema.threads.tenantId, ctx.tenantId),
            eq(schema.threads.customerId, kunde.id),
            eq(schema.threads.kind, 'customer_dealer'),
          ),
        )
        .orderBy(desc(schema.threads.lastMessageAt)),
    );
  }),

  meldinger: customerProcedure
    .input(z.object({ threadId: z.uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
      return withCustomer(ctx.db, ctx.tenantId, kunde.id, async (tx) => {
        const [traad] = input.threadId
          ? await tx
              .select({ id: schema.threads.id })
              .from(schema.threads)
              .where(
                and(eq(schema.threads.id, input.threadId), eq(schema.threads.customerId, kunde.id)),
              )
              .limit(1)
          : await tx
              .select({ id: schema.threads.id })
              .from(schema.threads)
              .where(
                and(
                  eq(schema.threads.tenantId, ctx.tenantId),
                  eq(schema.threads.customerId, kunde.id),
                  eq(schema.threads.kind, 'customer_dealer'),
                ),
              )
              .orderBy(desc(schema.threads.lastMessageAt))
              .limit(1);
        if (!traad) return { threadId: null as string | null, meldinger: [] };
        const rader = await tx
          .select({
            id: schema.messages.id,
            body: schema.messages.body,
            authorId: schema.messages.authorId,
            direction: schema.messages.direction,
            createdAt: schema.messages.createdAt,
          })
          .from(schema.messages)
          .where(eq(schema.messages.threadId, traad.id))
          .orderBy(schema.messages.createdAt);
        return { threadId: traad.id, meldinger: rader };
      });
    }),

  sendMelding: customerProcedure
    .input(z.object({ body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
      const nylig = await withCustomer(ctx.db, ctx.tenantId, kunde.id, (tx) =>
        tx
          .select({ id: schema.messages.id })
          .from(schema.messages)
          .innerJoin(schema.threads, eq(schema.threads.id, schema.messages.threadId))
          .where(
            and(
              eq(schema.messages.authorId, ctx.userId),
              eq(schema.threads.customerId, kunde.id),
              gte(schema.messages.createdAt, new Date(Date.now() - 60_000)),
            ),
          ),
      );
      if (nylig.length >= KUNDE_MELDING_PER_MINUTT) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Vent litt før du sender mer.' });
      }
      try {
        return await sendKundeMelding(ctx.db, {
          tenantId: ctx.tenantId,
          customerId: kunde.id,
          userId: ctx.userId,
          epost: kunde.epost,
          telefon: kunde.telefon,
          body: input.body,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  /** F34 / F11c — shop er blokkert (F10-03). Ingen kasse, ingen Vipps. */
  butikk: customerProcedure.query(async ({ ctx }) => {
    await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return kundeButikkStatus();
  }),

  kvitteringer: customerProcedure.query(async ({ ctx }) => {
    await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return [] as Array<{ id: string; tittel: string; tid: Date }>;
  }),

  /** F35 / F12 — art. 15. Bare kundens egne rader. */
  mineData: customerProcedure.query(async ({ ctx }) => {
    const kunde = await finnKunde({ db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId });
    return withCustomer(ctx.db, ctx.tenantId, kunde.id, async (tx) => {
      const bookinger = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
        })
        .from(schema.bookings)
        .where(eq(schema.bookings.customerId, kunde.id));
      const kjoretoy = await tx
        .select({
          id: schema.vehicles.id,
          type: schema.vehicles.type,
          regNumber: schema.vehicles.regNumber,
        })
        .from(schema.vehicles)
        .where(eq(schema.vehicles.customerId, kunde.id));
      const traader = await tx
        .select({ id: schema.threads.id, subject: schema.threads.subject })
        .from(schema.threads)
        .where(eq(schema.threads.customerId, kunde.id));
      return {
        kunde: { navn: kunde.navn, epost: kunde.epost, telefon: kunde.telefon },
        bookinger,
        kjoretoy,
        traader,
      };
    });
  }),
});
