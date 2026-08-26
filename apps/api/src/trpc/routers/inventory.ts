import { and, asc, desc, eq, ilike, or, schema, sql, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * Lager. Driftslageret. **kjerne — ingen modul-gate.**
 * Lager er ikke et tillegg man kjøper: et verksted uten deloversikt er et
 * verksted uten drift. Derfor `protectedProcedure`/`adminProcedure` og ingen
 * entitlement-sjekk (jf. F0-16, som gjelder Butikk).
 * Sikkerhetsvalgene i denne fila, og hvorfor
 * A03 (injection): sortering kommer fra klienten. Den slås opp i en
 * Allowlist og blir aldri satt inn i SQL som tekst. `sql.raw(input.sortBy)`
 * ville vært injection med ekstra steg — et kolonnenavn fra en klient er like
 * mye brukerinput som et søkeord.
 * CWE-639 (idor): `sku` er gjettbar med vilje. Hvert oppslag har tenant i
 * WHERE i tillegg til RLS — belte og bukseseler, fordi den dagen noen kaller
 * en av disse funksjonene utenfor `withTenant` skal svaret være «ingenting»,
 * ikke «en annen forhandlers del».
 * RBAC: uttak og innregistrering er `protectedProcedure` (dagens arbeid);
 * korreksjon og lokasjoner er `adminProcedure`. En ansatt skal kunne ta ut en
 * del uten å kunne justere beholdningen — et uttak er sporbart mot en jobb, en
 * justering er et tall noen bestemte.
 */

/**
 * A03 — Lovlige sorteringsfelt. Ikke en bekvemmelighet, en sperre.
 * Nøkkelen er det klienten sender; verdien er kolonnen vi velger.
 */
const PART_SORT = {
  sku: schema.parts.sku,
  navn: schema.parts.name,
  kategori: schema.parts.category,
  opprettet: schema.parts.createdAt,
} as const;

const partSortSchema = z.enum(['sku', 'navn', 'kategori', 'opprettet']).default('sku');
const retningSchema = z.enum(['asc', 'desc']).default('asc');

export const inventoryRouter = router({
  /* Deler */

  /**
   * Deleliste med søk, sortering og aggregert beholdning.
   * Beholdningen summeres over alle lokasjoner, og `tilgjengelig` er det tallet
   * som betyr noe i praksis: **onHand − reserved**. Å vise `onHand` alene ville
   * vært å love bort deler som allerede er lovet bort.
   */
  listParts: protectedProcedure
    .input(
      z
        .object({
          sok: z.string().max(120).optional(),
          sorter: partSortSchema,
          retning: retningSchema,
          kunLav: z.boolean().default(false),
          limit: z.number().int().min(1).max(200).default(100),
        })
        // Zod v4 krever hele utdata-formen her, ikke `{}`.
        .default({ sorter: 'sku', retning: 'asc', kunLav: false, limit: 100 }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const kolonne = PART_SORT[input.sorter];
        const sortering = input.retning === 'desc' ? desc(kolonne) : asc(kolonne);

        // Søket er parametrisert (`ilike` med binding) — ingen strengbygging.
        const sokFilter = input.sok?.trim()
          ? or(
              ilike(schema.parts.sku, `%${input.sok.trim()}%`),
              ilike(schema.parts.name, `%${input.sok.trim()}%`),
              ilike(schema.parts.category, `%${input.sok.trim()}%`),
            )
          : undefined;

        const rader = await tx
          .select({
            id: schema.parts.id,
            sku: schema.parts.sku,
            name: schema.parts.name,
            category: schema.parts.category,
            unit: schema.parts.unit,
            costMinor: schema.parts.costMinor,
            minStock: schema.parts.minStock,
            active: schema.parts.active,
            onHand: sql<number>`coalesce(sum(${schema.stockLevels.onHand}), 0)::int`,
            reserved: sql<number>`coalesce(sum(${schema.stockLevels.reserved}), 0)::int`,
          })
          .from(schema.parts)
          .leftJoin(
            schema.stockLevels,
            and(
              eq(schema.stockLevels.partId, schema.parts.id),
              // Tenant også i join-en. RLS dekker det, men en join er nettopp
              // stedet der en glemt betingelse blir usynlig.
              eq(schema.stockLevels.tenantId, ctx.tenantId),
            ),
          )
          .where(and(eq(schema.parts.tenantId, ctx.tenantId), sokFilter))
          .groupBy(schema.parts.id)
          .orderBy(sortering)
          .limit(input.limit);

        const medTilgjengelig = rader.map((r) => ({
          ...r,
          tilgjengelig: r.onHand - r.reserved,
          underMinimum: r.minStock != null && r.onHand - r.reserved < r.minStock,
        }));

        return input.kunLav ? medTilgjengelig.filter((r) => r.underMinimum) : medTilgjengelig;
      }),
    ),

  /** Én del med beholdning per lokasjon. */
  part: protectedProcedure.input(z.object({ id: z.uuid() })).query(({ ctx, input }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [del] = await tx
        .select()
        .from(schema.parts)
        // CWE-639: id og tenant. Aldri id alene.
        .where(and(eq(schema.parts.id, input.id), eq(schema.parts.tenantId, ctx.tenantId)));
      if (!del) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke delen' });

      const niva = await tx
        .select({
          locationId: schema.stockLevels.locationId,
          kode: schema.stockLocations.code,
          navn: schema.stockLocations.name,
          onHand: schema.stockLevels.onHand,
          reserved: schema.stockLevels.reserved,
        })
        .from(schema.stockLevels)
        .innerJoin(
          schema.stockLocations,
          eq(schema.stockLocations.id, schema.stockLevels.locationId),
        )
        .where(
          and(eq(schema.stockLevels.partId, del.id), eq(schema.stockLevels.tenantId, ctx.tenantId)),
        );

      return { del, niva: niva.map((n) => ({ ...n, tilgjengelig: n.onHand - n.reserved })) };
    }),
  ),

  createPart: adminProcedure
    .input(
      z.object({
        sku: z.string().min(1).max(64),
        name: z.string().min(1).max(160),
        category: z.string().max(64).optional(),
        unit: z.string().max(16).default('stk'),
        costMinor: z.number().int().min(0).optional(),
        minStock: z.number().int().min(0).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [finnes] = await tx
          .select({ id: schema.parts.id })
          .from(schema.parts)
          .where(and(eq(schema.parts.tenantId, ctx.tenantId), eq(schema.parts.sku, input.sku)));
        if (finnes) {
          throw new TRPCError({ code: 'CONFLICT', message: `Delenummer «${input.sku}» finnes` });
        }
        const [ny] = await tx
          .insert(schema.parts)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return ny;
      }),
    ),

  /* Lokasjoner */

  listLocations: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select()
        .from(schema.stockLocations)
        .where(eq(schema.stockLocations.tenantId, ctx.tenantId))
        .orderBy(asc(schema.stockLocations.code)),
    ),
  ),

  createLocation: adminProcedure
    .input(z.object({ code: z.string().min(1).max(32), name: z.string().min(1).max(120) }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [ny] = await tx
          .insert(schema.stockLocations)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return ny;
      }),
    ),

  /* Bevegelser */

  listMovements: protectedProcedure
    .input(
      z
        .object({
          partId: z.uuid().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .default({ limit: 50 }),
    )
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .select({
            id: schema.stockMovements.id,
            kind: schema.stockMovements.kind,
            quantity: schema.stockMovements.quantity,
            note: schema.stockMovements.note,
            createdAt: schema.stockMovements.createdAt,
            actorUserId: schema.stockMovements.actorUserId,
            sku: schema.parts.sku,
            partName: schema.parts.name,
            locationCode: schema.stockLocations.code,
          })
          .from(schema.stockMovements)
          .innerJoin(schema.parts, eq(schema.parts.id, schema.stockMovements.partId))
          .innerJoin(
            schema.stockLocations,
            eq(schema.stockLocations.id, schema.stockMovements.locationId),
          )
          .where(
            and(
              eq(schema.stockMovements.tenantId, ctx.tenantId),
              input.partId ? eq(schema.stockMovements.partId, input.partId) : undefined,
            ),
          )
          .orderBy(desc(schema.stockMovements.createdAt))
          .limit(input.limit),
      ),
    ),

  /**
   * Registrer en bevegelse og oppdater beholdningen — i ÉN transaksjon.
   * `actorUserId` tas fra sesjonen, aldri fra input. Ellers kunne en
   * bruker skrevet historikk i en kollegas navn.
   * Regnestykket per type:
   * in → onHand + n
   * out → onHand − n, og reserved − n (uttaket innfrir reservasjonen)
   * adjust → onHand settes til n (opptelling)
   * reserve → reserved + n (onHand står — delen er der, men lovet bort)
   * release → reserved − n
   * `adjust` er `adminProcedure`-territorium, men ligger her fordi det er samme
   * skriving; rollesjekken står i mutasjonen under.
   */
  move: protectedProcedure
    .input(
      z.object({
        partId: z.uuid(),
        locationId: z.uuid(),
        kind: z.enum(['in', 'out', 'adjust', 'reserve', 'release']),
        quantity: z.number().int().min(0).max(1_000_000),
        note: z.string().max(280).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (input.kind === 'adjust' && ctx.role !== 'dealer_admin' && ctx.role !== 'endwise_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Korreksjon av beholdning krever forhandler-admin',
        });
      }

      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        // Begge må høre til tenanten. RLS ville uansett skjult dem, men en
        // eksplisitt sjekk gir «fant ikke» i stedet for en rar fremmednøkkelfeil.
        const [del] = await tx
          .select({ id: schema.parts.id })
          .from(schema.parts)
          .where(and(eq(schema.parts.id, input.partId), eq(schema.parts.tenantId, ctx.tenantId)));
        const [lok] = await tx
          .select({ id: schema.stockLocations.id })
          .from(schema.stockLocations)
          .where(
            and(
              eq(schema.stockLocations.id, input.locationId),
              eq(schema.stockLocations.tenantId, ctx.tenantId),
            ),
          );
        if (!del || !lok) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ukjent del eller lokasjon' });
        }

        const [eksisterende] = await tx
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.tenantId, ctx.tenantId),
              eq(schema.stockLevels.partId, input.partId),
              eq(schema.stockLevels.locationId, input.locationId),
            ),
          );

        const naOnHand = eksisterende?.onHand ?? 0;
        const naReservert = eksisterende?.reserved ?? 0;

        let onHand = naOnHand;
        let reserved = naReservert;
        switch (input.kind) {
          case 'in':
            onHand = naOnHand + input.quantity;
            break;
          case 'out':
            onHand = naOnHand - input.quantity;
            reserved = Math.max(0, naReservert - input.quantity);
            break;
          case 'adjust':
            onHand = input.quantity;
            break;
          case 'reserve':
            reserved = naReservert + input.quantity;
            break;
          case 'release':
            reserved = Math.max(0, naReservert - input.quantity);
            break;
        }

        if (onHand < 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Beholdningen kan ikke bli negativ (har ${naOnHand})`,
          });
        }
        // A08: kan ikke reservere mer enn det som faktisk står på hylla.
        if (reserved > onHand) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Kan ikke reservere ${reserved} når bare ${onHand} står på lager`,
          });
        }

        if (eksisterende) {
          await tx
            .update(schema.stockLevels)
            .set({ onHand, reserved, updatedAt: sql`now()` })
            .where(eq(schema.stockLevels.id, eksisterende.id));
        } else {
          await tx.insert(schema.stockLevels).values({
            tenantId: ctx.tenantId,
            partId: input.partId,
            locationId: input.locationId,
            onHand,
            reserved,
          });
        }

        const [bevegelse] = await tx
          .insert(schema.stockMovements)
          .values({
            tenantId: ctx.tenantId,
            partId: input.partId,
            locationId: input.locationId,
            kind: input.kind,
            quantity: input.quantity,
            actorUserId: ctx.userId,
            note: input.note,
          })
          .returning();

        return { bevegelse, onHand, reserved, tilgjengelig: onHand - reserved };
      });
    }),

  /** Nøkkeltall til Lager-forsiden. Aggregater, ingen PII. */
  summary: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [tall] = await tx
        .select({
          antallDeler: sql<number>`count(distinct ${schema.parts.id})::int`,
          totaltAntall: sql<number>`coalesce(sum(${schema.stockLevels.onHand}), 0)::int`,
          reservert: sql<number>`coalesce(sum(${schema.stockLevels.reserved}), 0)::int`,
        })
        .from(schema.parts)
        .leftJoin(
          schema.stockLevels,
          and(
            eq(schema.stockLevels.partId, schema.parts.id),
            eq(schema.stockLevels.tenantId, ctx.tenantId),
          ),
        )
        .where(eq(schema.parts.tenantId, ctx.tenantId));

      const [lok] = await tx
        .select({ antall: sql<number>`count(*)::int` })
        .from(schema.stockLocations)
        .where(eq(schema.stockLocations.tenantId, ctx.tenantId));

      return {
        antallDeler: tall?.antallDeler ?? 0,
        totaltAntall: tall?.totaltAntall ?? 0,
        reservert: tall?.reservert ?? 0,
        tilgjengelig: (tall?.totaltAntall ?? 0) - (tall?.reservert ?? 0),
        antallLokasjoner: lok?.antall ?? 0,
      };
    }),
  ),
});
