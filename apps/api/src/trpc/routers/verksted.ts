import { and, desc, eq, schema, withPlatformAdmin, withPlatformInspect } from '@endwise/db';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { endwiseInspectProcedure, router } from '../init.ts';

const slugInput = z.object({ slug: z.string().min(1).max(80) });

async function finnForhandler(db: Parameters<typeof withPlatformAdmin>[0], slug: string) {
  const [t] = await withPlatformAdmin(db, (tx) =>
    tx
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        kind: schema.tenants.kind,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1),
  );
  if (!t || erPlattformTenant(t)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren.' });
  }
  return t;
}

/**
 * Se verkstedet — READ via slug, ikke sesjon-tenant.
 * Mutations 403 (`endwiseInspectProcedure`). Ingen setActive.
 */
export const verkstedRouter = router({
  meta: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    return finnForhandler(ctx.db, input.slug);
  }),

  dashboard: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const t = await finnForhandler(ctx.db, input.slug);
    return withPlatformInspect(ctx.db, t.id, async (tx) => {
      const bookings = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          endsAt: schema.bookings.endsAt,
          customerName: schema.customers.name,
          regNumber: schema.vehicles.regNumber,
          mechanicId: schema.bookings.mechanicId,
          mechanicName: schema.mechanics.name,
          serviceName: schema.services.name,
        })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
        .innerJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
        .innerJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .orderBy(desc(schema.bookings.startsAt))
        .limit(100);
      const mechanics = await tx.select().from(schema.mechanics);
      return { tenant: t, bookings, mechanics };
    });
  }),

  saker: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const t = await finnForhandler(ctx.db, input.slug);
    return withPlatformInspect(ctx.db, t.id, async (tx) => {
      const rader = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          endsAt: schema.bookings.endsAt,
          customerName: schema.customers.name,
          regNumber: schema.vehicles.regNumber,
          mechanicName: schema.mechanics.name,
          serviceName: schema.services.name,
        })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
        .innerJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
        .innerJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .orderBy(desc(schema.bookings.startsAt))
        .limit(200);
      return { tenant: t, rader };
    });
  }),

  kunder: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const t = await finnForhandler(ctx.db, input.slug);
    // Ingen customers-policy under inspect — e-post/telefon er persondata
    // støtte ikke trenger. Tom liste, ikke withTenant/withPlatformInspect-dump.
    return { tenant: t, rader: [] as Array<{ id: string; name: string }> };
  }),

  kjoretoy: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const t = await finnForhandler(ctx.db, input.slug);
    return withPlatformInspect(ctx.db, t.id, async (tx) => {
      const rader = await tx
        .select({
          id: schema.vehicles.id,
          regNumber: schema.vehicles.regNumber,
          make: schema.vehicles.make,
          model: schema.vehicles.model,
          type: schema.vehicles.type,
          customerName: schema.customers.name,
        })
        .from(schema.vehicles)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.vehicles.customerId))
        .orderBy(schema.vehicles.regNumber)
        .limit(200);
      return { tenant: t, rader };
    });
  }),

  innboks: endwiseInspectProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const t = await finnForhandler(ctx.db, input.slug);
    return withPlatformInspect(ctx.db, t.id, async (tx) => {
      const rader = await tx
        .select({
          id: schema.threads.id,
          kind: schema.threads.kind,
          subject: schema.threads.subject,
          lastMessageAt: schema.threads.lastMessageAt,
          channel: schema.threads.channel,
        })
        .from(schema.threads)
        .where(and(eq(schema.threads.tenantId, t.id), eq(schema.threads.kind, 'dealer_admin')))
        .orderBy(desc(schema.threads.lastMessageAt))
        .limit(100);
      return { tenant: t, rader };
    });
  }),

  innboksMeldinger: endwiseInspectProcedure
    .input(z.object({ slug: z.string().min(1).max(80), threadId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const t = await finnForhandler(ctx.db, input.slug);
      return withPlatformInspect(ctx.db, t.id, async (tx) => {
        const [traad] = await tx
          .select({
            id: schema.threads.id,
            subject: schema.threads.subject,
            kind: schema.threads.kind,
          })
          .from(schema.threads)
          .where(
            and(
              eq(schema.threads.id, input.threadId),
              eq(schema.threads.tenantId, t.id),
              eq(schema.threads.kind, 'dealer_admin'),
            ),
          );
        if (!traad) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke tråden.' });
        }
        const meldinger = await tx
          .select({
            id: schema.messages.id,
            body: schema.messages.body,
            authorId: schema.messages.authorId,
            createdAt: schema.messages.createdAt,
          })
          .from(schema.messages)
          .where(eq(schema.messages.threadId, input.threadId))
          .orderBy(schema.messages.createdAt);
        return { tenant: t, traad, meldinger };
      });
    }),

  /** Alltid 403 — dokumenterer at Se verkstedet ikke skriver. */
  skriv: endwiseInspectProcedure.input(slugInput).mutation(() => {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Kun lesing' });
  }),
});
