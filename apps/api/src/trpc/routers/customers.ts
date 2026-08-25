import { and, asc, desc, eq, ilike, or, schema, sql, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F2-06 / F5-02 — Kunderegister. Alle spørringer går gjennom withTenant → RLS.
 *
 * ── «Søk opp en kunde og se alt» (F5-02) ──────────────────────────────────
 * `byId` returnerer kunden MED kjøretøy, servicehistorikk og meldingstråder i
 * ett kall. Alternativet — fire separate kall fra klienten — ville gitt fire
 * lastetilstander på én skjerm, og en side som blafrer inn i fire etapper.
 *
 * ⛔ **Sorteringsfelt er en allowlist** (A03, samme regel som i lageret). Et
 * kolonnenavn fra klienten er like mye brukerinput som et søkeord.
 */
const KUNDE_SORT = {
  navn: schema.customers.name,
  opprettet: schema.customers.createdAt,
} as const;

export const customersRouter = router({
  /**
   * Kundeliste med søk. Søket treffer navn, e-post og telefon — det er de tre
   * tingene man har for hånden når kunden ringer.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          sok: z.string().max(120).optional(),
          sorter: z.enum(['navn', 'opprettet']).default('navn'),
          retning: z.enum(['asc', 'desc']).default('asc'),
          /** F8-01: skill Quick-speilede kunder fra dem som er født her. */
          kilde: z.enum(['alle', 'endwise', 'quick']).default('alle'),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .default({ sorter: 'navn', retning: 'asc', kilde: 'alle', limit: 100 }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const kolonne = KUNDE_SORT[input.sorter];
        const sortering = input.retning === 'desc' ? desc(kolonne) : asc(kolonne);
        const q = input.sok?.trim();

        return tx
          .select({
            id: schema.customers.id,
            name: schema.customers.name,
            email: schema.customers.email,
            phone: schema.customers.phone,
            source: schema.customers.source,
            createdAt: schema.customers.createdAt,
            /** Tråddeltaker når kunden har «Min side». Aldri vist i UI. */
            userId: schema.customers.userId,
            // Antall kjøretøy rett i lista — «har denne kunden en MC hos oss?»
            // er spørsmålet man stiller før man klikker.
            antallKjoretoy: sql<number>`(
              select count(*)::int from vehicles v
              where v.customer_id = ${schema.customers.id}
                and v.tenant_id = ${ctx.tenantId}
            )`,
          })
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.tenantId, ctx.tenantId),
              input.kilde === 'alle' ? undefined : eq(schema.customers.source, input.kilde),
              q
                ? or(
                    ilike(schema.customers.name, `%${q}%`),
                    ilike(schema.customers.email, `%${q}%`),
                    ilike(schema.customers.phone, `%${q}%`),
                  )
                : undefined,
            ),
          )
          .orderBy(sortering)
          .limit(input.limit);
      }),
    ),

  /**
   * Kundekortet — ALT om én kunde i ett kall.
   *
   * ⚠️ CWE-639: `id` OG `tenant_id` i hver WHERE, ikke bare RLS. Den dagen noen
   * kaller dette utenfor `withTenant`, skal svaret være «ingenting».
   */
  byId: protectedProcedure.input(z.object({ id: z.uuid() })).query(({ ctx, input }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [kunde] = await tx
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.id, input.id), eq(schema.customers.tenantId, ctx.tenantId)))
        .limit(1);
      if (!kunde) return null;

      const notater = await tx
        .select()
        .from(schema.customerNotes)
        .where(
          and(
            eq(schema.customerNotes.customerId, input.id),
            eq(schema.customerNotes.tenantId, ctx.tenantId),
          ),
        )
        .orderBy(desc(schema.customerNotes.createdAt));

      const kjoretoy = await tx
        .select()
        .from(schema.vehicles)
        .where(
          and(eq(schema.vehicles.customerId, input.id), eq(schema.vehicles.tenantId, ctx.tenantId)),
        )
        .orderBy(desc(schema.vehicles.createdAt));

      // Servicehistorikk: alle saker for kunden, nyeste først.
      const saker = await tx
        .select({
          id: schema.bookings.id,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          endsAt: schema.bookings.endsAt,
          notes: schema.bookings.notes,
          regNumber: schema.vehicles.regNumber,
          serviceName: schema.services.name,
          mechanicName: schema.mechanics.name,
          priceMinor: schema.serviceVersions.priceMinor,
        })
        .from(schema.bookings)
        .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
        .leftJoin(
          schema.serviceVersions,
          eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
        )
        .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
        .leftJoin(schema.mechanics, eq(schema.mechanics.id, schema.bookings.mechanicId))
        .where(
          and(eq(schema.bookings.customerId, input.id), eq(schema.bookings.tenantId, ctx.tenantId)),
        )
        .orderBy(desc(schema.bookings.startsAt))
        .limit(100);

      /**
       * Meldinger knyttet til kunden.
       *
       * ⚠️ Koblingen er `customers.user_id` → `thread_participants.participant_id`.
       * Har ikke kunden logget inn på «Min side» (F6), finnes ingen kobling — og
       * da er tom liste det ærlige svaret, ikke en gjetning på navn eller e-post.
       */
      const traader = kunde.userId
        ? await tx
            .select({
              id: schema.threads.id,
              kind: schema.threads.kind,
              subject: schema.threads.subject,
              createdAt: schema.threads.createdAt,
            })
            .from(schema.threads)
            .innerJoin(
              schema.threadParticipants,
              eq(schema.threadParticipants.threadId, schema.threads.id),
            )
            .where(
              and(
                eq(schema.threads.tenantId, ctx.tenantId),
                eq(schema.threadParticipants.participantId, kunde.userId),
              ),
            )
            .orderBy(desc(schema.threads.createdAt))
            .limit(20)
        : [];

      return { ...kunde, notater, kjoretoy, saker, traader };
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(160),
        email: z.email().optional(),
        phone: z.string().min(3).max(32).optional(),
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
    .input(z.object({ customerId: z.uuid(), body: z.string().min(1).max(4000) }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [finnes] = await tx
          .select({ id: schema.customers.id })
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.id, input.customerId),
              eq(schema.customers.tenantId, ctx.tenantId),
            ),
          );
        if (!finnes) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke kunden' });

        const [note] = await tx
          .insert(schema.customerNotes)
          // `authorId` fra SESJONEN, aldri fra input — ellers kunne noen
          // skrevet et notat i en kollegas navn.
          .values({ ...input, tenantId: ctx.tenantId, authorId: ctx.userId })
          .returning();
        return note;
      }),
    ),
});
