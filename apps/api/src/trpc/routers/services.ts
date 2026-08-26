import { and, asc, desc, eq, isNull, schema, withTenant } from '@endwise/db';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

const vehicleType = z.enum(['mc', 'boat', 'atv']);

/**
 * F2-04 / F2-05 / F5-04 — Tjenestekatalog, versjonert.
 * `update` lager en ny versjon. Den endrer aldri en eksisterende, fordi
 * bookinger fra i fjor peker på versjonen som gjaldt da. Endrer du prisen i dag,
 * skal fjorårets faktura fortsatt stemme.
 * Skriving krever dealer_admin (endret )
 * De tre skrivende prosedyrene lå på `protectedProcedure` så lenge de ikke
 * hadde ett eneste kallsted. I det F2-05 gir dem en flate, betyr det at hvem
 * som helst med en sesjon i tenanten kan endre prisen kunden betaler. RLS
 * svarer på «hvilken tenants rader», ikke «har denne personen lov». Samme
 * argument som `adminProcedure` selv fører for kompetanse (F3-12): en
 * dealer_staff er medlem, så RLS slipper ham inn i dataene — det er bare
 * rollesjekken som stopper ham. Lesing er fortsatt åpen for staff: de må se
 * katalogen for å booke manuelt.
 */
export const servicesRouter = router({
  /**
   * Gjeldende versjon av hver tjeneste.
   * `inkluderInaktive` er som standard usann, og det er booking-motorens
   * garanti: en deaktivert tjeneste skal aldri kunne velges på en ny sak.
   * Katalogflaten ber eksplisitt om dem, for å kunne vise dem fram igjen.
   */
  list: protectedProcedure
    .input(z.object({ inkluderInaktive: z.boolean().optional() }).optional())
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .select({
            id: schema.services.id,
            name: schema.services.name,
            vehicleType: schema.services.vehicleType,
            active: schema.services.active,
            createdAt: schema.services.createdAt,
            // Bookinger peker på versjonen (F2-04) — createBooking trenger denne.
            serviceVersionId: schema.serviceVersions.id,
            version: schema.serviceVersions.version,
            durationMinutes: schema.serviceVersions.durationMinutes,
            priceMinor: schema.serviceVersions.priceMinor,
            skills: schema.serviceVersions.skills,
            description: schema.serviceVersions.description,
            validFrom: schema.serviceVersions.validFrom,
          })
          .from(schema.services)
          .innerJoin(
            schema.serviceVersions,
            and(
              eq(schema.serviceVersions.serviceId, schema.services.id),
              isNull(schema.serviceVersions.validTo),
            ),
          )
          // Utelatt input = aktive tjenester. Den trygge standarden.
          .where(input?.inkluderInaktive ? undefined : eq(schema.services.active, true))
          .orderBy(asc(schema.services.name)),
      ),
    ),

  /**
   * Hele versjonshistorikken for én tjeneste — nyeste først.
   * Uten denne er «versjonering» bare et tall i UI-et. Poenget med to tabeller
   * er at man skal kunne se hva som gjaldt før; et versjonsnummer man ikke kan
   * slå opp, beviser ingenting for en forhandler som lurer på hvorfor
   * fjorårets faktura sier noe annet enn prislista i dag.
   */
  versions: protectedProcedure
    .input(z.object({ serviceId: z.uuid() }))
    .query(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .select()
          .from(schema.serviceVersions)
          .where(eq(schema.serviceVersions.serviceId, input.serviceId))
          .orderBy(desc(schema.serviceVersions.version)),
      ),
    ),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        vehicleType,
        durationMinutes: z
          .number()
          .int()
          .min(5)
          .max(8 * 60),
        priceMinor: z.number().int().min(0).optional(),
        skills: z.array(z.string()).default([]),
        description: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [service] = await tx
          .insert(schema.services)
          .values({ tenantId: ctx.tenantId, name: input.name, vehicleType: input.vehicleType })
          .returning();
        if (!service) throw new Error('Kunne ikke opprette tjeneste');

        const [version] = await tx
          .insert(schema.serviceVersions)
          .values({
            tenantId: ctx.tenantId,
            serviceId: service.id,
            version: 1,
            durationMinutes: input.durationMinutes,
            priceMinor: input.priceMinor ?? null,
            skills: input.skills,
            description: input.description ?? null,
          })
          .returning();

        return { service, version };
      }),
    ),

  /** Ny versjon. Den forrige lukkes med `validTo` — den slettes ikke. */
  update: adminProcedure
    .input(
      z.object({
        serviceId: z.uuid(),
        durationMinutes: z
          .number()
          .int()
          .min(5)
          .max(8 * 60),
        priceMinor: z.number().int().min(0).optional(),
        skills: z.array(z.string()).default([]),
        description: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [current] = await tx
          .select()
          .from(schema.serviceVersions)
          .where(eq(schema.serviceVersions.serviceId, input.serviceId))
          .orderBy(desc(schema.serviceVersions.version))
          .limit(1);
        if (!current) throw new Error('Tjenesten finnes ikke');

        const now = new Date();
        await tx
          .update(schema.serviceVersions)
          .set({ validTo: now })
          .where(eq(schema.serviceVersions.id, current.id));

        const [next] = await tx
          .insert(schema.serviceVersions)
          .values({
            tenantId: ctx.tenantId,
            serviceId: input.serviceId,
            version: current.version + 1,
            durationMinutes: input.durationMinutes,
            priceMinor: input.priceMinor ?? null,
            skills: input.skills,
            description: input.description ?? null,
            validFrom: now,
          })
          .returning();

        return next;
      }),
    ),

  /** Deaktiver — aldri slett. Historikken skal overleve. */
  deactivate: adminProcedure
    .input(z.object({ serviceId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .update(schema.services)
          .set({ active: false })
          .where(eq(schema.services.id, input.serviceId)),
      ),
    ),

  /**
   * Angre en deaktivering.
   * Finnes fordi `deactivate` ellers er en enveisdør fra UI-et: den
   * deaktiverte tjenesten forsvinner ut av `list`, og uten denne ruta er eneste
   * vei tilbake et manuelt UPDATE i basen. Versjonene røres ikke — tjenesten
   * kommer tilbake med nøyaktig den versjonen som gjaldt da den ble slått av.
   */
  reactivate: adminProcedure
    .input(z.object({ serviceId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .update(schema.services)
          .set({ active: true })
          .where(eq(schema.services.id, input.serviceId)),
      ),
    ),
});
