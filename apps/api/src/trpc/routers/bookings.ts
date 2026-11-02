import { erMekanikerKonto } from '@endwise/auth';
import {
  and,
  type Database,
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
  sql,
  withTenant,
} from '@endwise/db';
import {
  appendEndringNotat,
  assertEndringJobSlot,
  type BookingEndringSnapshot,
  createBooking,
  type EndringDecision,
  type EndringKind,
  EndringSlotError,
  formatServiceNames,
  harBehandletEndring,
  harFeltEndring,
  harVentendeEndring,
  InvalidTransitionError,
  lockMechanic,
  lockShopSlots,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  malFraOnske,
  markerEndringBehandlet,
  parseVentendeOnske,
  SlotConflictError,
  snapshotFraBooking,
  type TenantTx,
  transitionBooking,
} from '@endwise/modules/booking';
import { lesAvatar } from '@endwise/modules/profil';
import { publishEvent } from '@endwise/modules/stream';
import { osloDagsvindu } from '@endwise/modules/tid';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router, staffProcedure } from '../init.ts';
import { loggDealerWritePostgresFeil, mapDealerWritePostgresFeil } from '../slett-postgres.ts';

const status = z.enum(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);

/** Domenefeil → riktig HTTP-kode. 409 for slot-konflikt: klienten kan prøve et annet tidspunkt. */
function toTRPCError(error: unknown): never {
  if (error instanceof SlotConflictError) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message, cause: error });
  }
  if (error instanceof EndringSlotError) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message, cause: error });
  }
  if (error instanceof InvalidTransitionError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message, cause: error });
  }
  if (error instanceof TRPCError) throw error;
  loggDealerWritePostgresFeil('bookings', error);
  throw mapDealerWritePostgresFeil(error, 'Kunne ikke lagre jobben. Prøv igjen.');
}

async function lastEndringSlotLag(
  tx: TenantTx,
  booking: { id: string; serviceVersionId: string },
  maalStart: Date,
) {
  const [versjon] = await tx
    .select({ skills: schema.serviceVersions.skills })
    .from(schema.serviceVersions)
    .where(eq(schema.serviceVersions.id, booking.serviceVersionId))
    .limit(1);
  const mekanikere = await tx
    .select({
      id: schema.mechanics.id,
      active: schema.mechanics.active,
    })
    .from(schema.mechanics);
  const ferdigheter =
    mekanikere.length === 0
      ? []
      : await tx
          .select({
            mechanicId: schema.mechanicSkills.mechanicId,
            skillKey: schema.mechanicSkills.skillKey,
          })
          .from(schema.mechanicSkills)
          .where(
            inArray(
              schema.mechanicSkills.mechanicId,
              mekanikere.map((m) => m.id),
            ),
          );
  const skillsByMech = new Map<string, string[]>();
  for (const f of ferdigheter) {
    const list = skillsByMech.get(f.mechanicId) ?? [];
    list.push(f.skillKey);
    skillsByMech.set(f.mechanicId, list);
  }
  const dag = osloDagsvindu(maalStart);
  const jobber = await tx
    .select({
      id: schema.bookings.id,
      mechanicId: schema.bookings.mechanicId,
      startsAt: schema.bookings.startsAt,
      endsAt: schema.bookings.endsAt,
      status: schema.bookings.status,
    })
    .from(schema.bookings)
    .where(and(lt(schema.bookings.startsAt, dag.to), gt(schema.bookings.endsAt, dag.from)));
  return {
    requiredSkills: versjon?.skills ?? [],
    mekanikere: mekanikere.map((m) => ({
      id: m.id,
      active: m.active,
      skillKeys: skillsByMech.get(m.id) ?? [],
    })),
    jobber: jobber
      .filter((j) => j.id !== booking.id)
      .map((j) => ({
        mechanicId: j.mechanicId,
        startsAt: j.startsAt,
        endsAt: j.endsAt,
        status: j.status,
      })),
  };
}

async function skrivEndringAudit(
  tx: TenantTx,
  input: {
    tenantId: string;
    actor: string;
    bookingId: string;
    action: string;
    metadata: Record<string, unknown>;
  },
) {
  await tx.insert(schema.auditLog).values({
    tenantId: input.tenantId,
    actor: input.actor,
    action: input.action,
    subjectType: 'booking',
    subjectId: input.bookingId,
    metadata: input.metadata,
  });
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
  mechanicUserId: schema.mechanics.userId,
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

async function attachFarger<T extends { mechanicUserId?: string | null }>(db: Database, rows: T[]) {
  const ids = [
    ...new Set(rows.map((r) => r.mechanicUserId).filter((id): id is string => Boolean(id))),
  ];
  if (ids.length === 0) return rows.map((r) => ({ ...r, farge: null as string | null }));
  const prefs = await db
    .select({
      userId: schema.userPreferences.userId,
      avatarColor: schema.userPreferences.avatarColor,
      avatarHue: schema.userPreferences.avatarHue,
    })
    .from(schema.userPreferences)
    .where(inArray(schema.userPreferences.userId, ids));
  const map = new Map(prefs.map((p) => [p.userId, lesAvatar(p).farge]));
  return rows.map((r) => ({
    ...r,
    farge: r.mechanicUserId ? (map.get(r.mechanicUserId) ?? null) : null,
  }));
}

export const bookingsRouter = router({
  /** F3-11 / F3-09 — Internt jobb-inntak. Flere tjenester + manuell varighet. */
  create: staffProcedure
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
        if (erMekanikerKonto(ctx) && ctx.mechanicId) {
          const [rad] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
            tx
              .select({ mechanicId: schema.bookings.mechanicId })
              .from(schema.bookings)
              .where(eq(schema.bookings.id, input.bookingId))
              .limit(1),
          );
          if (!rad || rad.mechanicId !== ctx.mechanicId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Mekaniker har ikke tilgang til denne jobben.',
            });
          }
        }
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
        const egetVerksted = erMekanikerKonto(ctx) && ctx.mechanicId;
        const mekanikerFilter = egetVerksted ? ctx.mechanicId : input.mechanicId;
        if (mekanikerFilter) conditions.push(eq(schema.bookings.mechanicId, mekanikerFilter));
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
        return attachFarger(ctx.db, await attachJobLines(tx, rows));
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
      if (erMekanikerKonto(ctx) && ctx.mechanicId && booking.mechanicId !== ctx.mechanicId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Mekaniker har ikke tilgang til denne jobben.',
        });
      }
      const [enriched] = await attachFarger(ctx.db, await attachJobLines(tx, [booking]));
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
  /**
   * F7-05 / BIT 3 — desk melder avvik eller forespørsel på en jobb.
   * Samme notat-prefiks som mechanic.reportDeviation (`[AVVIK ` / `[FORESPOR `).
   */
  reportChange: staffProcedure
    .input(
      z.object({
        bookingId: z.uuid(),
        kind: z.enum(['avvik', 'forespor']),
        message: z.string().trim().min(1).max(500),
        startsAt: z.coerce.date().optional(),
        mechanicId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kind = input.kind as EndringKind;
      const onske = {
        startsAt: input.startsAt?.toISOString(),
        mechanicId: input.mechanicId,
      };
      try {
        await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [b] = await tx
            .select({ notes: schema.bookings.notes })
            .from(schema.bookings)
            .where(eq(schema.bookings.id, input.bookingId))
            .limit(1);
          if (!b) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke jobben.' });
          }
          const notes = appendEndringNotat(b.notes, kind, input.message, new Date(), onske);
          await tx
            .update(schema.bookings)
            .set({ notes, updatedAt: sql`now()` })
            .where(eq(schema.bookings.id, input.bookingId));
          await skrivEndringAudit(tx, {
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            bookingId: input.bookingId,
            action: `booking.change.report.${kind}`,
            metadata: { kind, ...onske },
          });
        });
      } catch (error) {
        return toTRPCError(error);
      }

      await publishEvent(ctx.db, {
        tenantId: ctx.tenantId,
        type: kind === 'avvik' ? 'booking.deviation' : 'booking.change',
        payload: { bookingId: input.bookingId, kind },
        subjectId: input.bookingId,
      });
      return { ok: true as const };
    }),

  /**
   * F7-05 / BIT 3 — Godkjenn / Avslå ventende avvik eller forespørsel.
   * Godkjenn flytter tid/mekaniker når ønsket, med jobSlots-sjekk.
   * Avslå rører ikke booking-feltene. Begge skriver audit + behandlet-notat.
   */
  resolveChange: staffProcedure
    .input(
      z.object({
        bookingId: z.uuid(),
        kind: z.enum(['avvik', 'forespor']),
        decision: z.enum(['godkjent', 'avslatt']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kind = input.kind as EndringKind;
      const decision = input.decision as EndringDecision;
      try {
        await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [b] = await tx
            .select({
              notes: schema.bookings.notes,
              startsAt: schema.bookings.startsAt,
              endsAt: schema.bookings.endsAt,
              mechanicId: schema.bookings.mechanicId,
              serviceVersionId: schema.bookings.serviceVersionId,
            })
            .from(schema.bookings)
            .where(eq(schema.bookings.id, input.bookingId))
            .limit(1);
          if (!b) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke jobben.' });
          }
          if (!harVentendeEndring(b.notes, kind)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Ingen ventende endring å behandle på denne jobben.',
            });
          }
          const previous = snapshotFraBooking(b);
          const notes = markerEndringBehandlet(b.notes ?? '', kind, decision);
          const patch: {
            notes: string;
            updatedAt: Date;
            startsAt?: Date;
            endsAt?: Date;
            mechanicId?: string;
          } = { notes, updatedAt: new Date() };

          if (decision === 'godkjent') {
            const onske = parseVentendeOnske(b.notes, kind);
            const mal = malFraOnske(b, onske);
            if (harFeltEndring(b, mal)) {
              await tx.execute(lockShopSlots(ctx.tenantId));
              await tx.execute(lockMechanic(ctx.tenantId, mal.mechanicId));
              if (mal.mechanicId !== b.mechanicId) {
                await tx.execute(lockMechanic(ctx.tenantId, b.mechanicId));
              }
              const lag = await lastEndringSlotLag(
                tx,
                { id: input.bookingId, serviceVersionId: b.serviceVersionId },
                mal.startsAt,
              );
              assertEndringJobSlot({
                mal,
                mekanikere: lag.mekanikere,
                jobber: lag.jobber,
                requiredSkills: lag.requiredSkills,
              });
              patch.startsAt = mal.startsAt;
              patch.endsAt = mal.endsAt;
              patch.mechanicId = mal.mechanicId;
            }
          }

          await tx
            .update(schema.bookings)
            .set(patch)
            .where(eq(schema.bookings.id, input.bookingId));
          await skrivEndringAudit(tx, {
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            bookingId: input.bookingId,
            action: `booking.change.${decision}`,
            metadata: {
              kind,
              decision,
              from: 'pending',
              previous,
              applied:
                decision === 'godkjent' && patch.startsAt
                  ? {
                      startsAt: patch.startsAt.toISOString(),
                      endsAt: patch.endsAt?.toISOString(),
                      mechanicId: patch.mechanicId,
                    }
                  : null,
            },
          });
        });
      } catch (error) {
        return toTRPCError(error);
      }

      await publishEvent(ctx.db, {
        tenantId: ctx.tenantId,
        type: 'booking.change',
        payload: { bookingId: input.bookingId, kind, decision },
        subjectId: input.bookingId,
      });
      return { ok: true as const, decision };
    }),

  /**
   * Angre siste behandling. Setter booking tilbake til verdiene i audit-raden
   * og skriver `booking.change.angre`. Avslått behandling har urørt booking.
   */
  undoChange: staffProcedure
    .input(z.object({ bookingId: z.uuid(), kind: z.enum(['avvik', 'forespor']) }))
    .mutation(async ({ ctx, input }) => {
      const kind = input.kind as EndringKind;
      try {
        await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [b] = await tx
            .select({
              notes: schema.bookings.notes,
              startsAt: schema.bookings.startsAt,
              endsAt: schema.bookings.endsAt,
              mechanicId: schema.bookings.mechanicId,
              serviceVersionId: schema.bookings.serviceVersionId,
            })
            .from(schema.bookings)
            .where(eq(schema.bookings.id, input.bookingId))
            .limit(1);
          if (!b) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke jobben.' });
          }
          if (!harBehandletEndring(b.notes)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Ingen behandling å angre på denne jobben.',
            });
          }
          const [siste] = await tx
            .select({
              action: schema.auditLog.action,
              metadata: schema.auditLog.metadata,
            })
            .from(schema.auditLog)
            .where(
              and(
                eq(schema.auditLog.subjectType, 'booking'),
                eq(schema.auditLog.subjectId, input.bookingId),
                inArray(schema.auditLog.action, [
                  'booking.change.godkjent',
                  'booking.change.avslatt',
                  'booking.change.angre',
                ]),
              ),
            )
            .orderBy(desc(schema.auditLog.occurredAt))
            .limit(1);
          if (!siste || siste.action === 'booking.change.angre') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Ingen behandling å angre på denne jobben.',
            });
          }
          const meta = (siste.metadata ?? {}) as {
            kind?: string;
            previous?: BookingEndringSnapshot;
          };
          if (meta.kind && meta.kind !== kind) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Siste behandling gjelder en annen type endring.',
            });
          }
          const previous = meta.previous;
          if (!previous) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Finner ikke forrige jobbverdier å gjenopprette.',
            });
          }
          const mal = {
            startsAt: new Date(previous.startsAt),
            endsAt: new Date(previous.endsAt),
            mechanicId: previous.mechanicId,
          };
          if (harFeltEndring(b, mal)) {
            await tx.execute(lockShopSlots(ctx.tenantId));
            await tx.execute(lockMechanic(ctx.tenantId, mal.mechanicId));
            const lag = await lastEndringSlotLag(
              tx,
              { id: input.bookingId, serviceVersionId: b.serviceVersionId },
              mal.startsAt,
            );
            assertEndringJobSlot({
              mal,
              mekanikere: lag.mekanikere,
              jobber: lag.jobber,
              requiredSkills: lag.requiredSkills,
            });
          }
          await tx
            .update(schema.bookings)
            .set({
              startsAt: mal.startsAt,
              endsAt: mal.endsAt,
              mechanicId: mal.mechanicId,
              notes: previous.notes,
              updatedAt: sql`now()`,
            })
            .where(eq(schema.bookings.id, input.bookingId));
          await skrivEndringAudit(tx, {
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            bookingId: input.bookingId,
            action: 'booking.change.angre',
            metadata: {
              kind,
              from: siste.action.replace('booking.change.', ''),
              previous: snapshotFraBooking(b),
              restored: previous,
            },
          });
        });
      } catch (error) {
        return toTRPCError(error);
      }

      await publishEvent(ctx.db, {
        tenantId: ctx.tenantId,
        type: 'booking.change',
        payload: { bookingId: input.bookingId, kind, decision: 'angre' },
        subjectId: input.bookingId,
      });
      return { ok: true as const };
    }),

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
              erMekanikerKonto(ctx) && ctx.mechanicId
                ? eq(schema.bookings.mechanicId, ctx.mechanicId)
                : input.mechanicId
                  ? eq(schema.bookings.mechanicId, input.mechanicId)
                  : undefined,
            ),
          )
          .orderBy(schema.bookings.startsAt);
        return attachFarger(ctx.db, await attachJobLines(tx, rows));
      }),
    ),
});
