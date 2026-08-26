import { and, eq, gte, inArray, lt, schema, withTenant } from '@endwise/db';
import { createRuleMatcher } from '@endwise/modules/matching';
import {
  lesAvatar,
  mekanikerStatusVisning,
  TOM_AVATAR,
  tellerSomBelastning,
  updateMechanicCapacity,
  visningsnavn,
} from '@endwise/modules/profil';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

function dagensVindu(): { fra: Date; til: Date } {
  const fra = new Date();
  fra.setHours(0, 0, 0, 0);
  const til = new Date(fra);
  til.setDate(til.getDate() + 1);
  return { fra, til };
}

export const mechanicsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, (tx) => tx.select().from(schema.mechanics)),
  ),

  /**
   * F6-19 / F3-08 — mekanikerlista med persistente avatarvalg og status-humor.
   * `list` er bevisst urørt: bookinger/saker/dashboard bruker den som
   * id→navn. Denne ruta beriker med dagens belastning og avatar.
   * `user_preferences` har ingen RLS. Isolasjonen kommer av at vi bare
   * slår opp IDer som allerede er hentet tenant-skopet fra `mechanics`.
   */
  oversikt: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const meks = await tx.select().from(schema.mechanics);
      if (meks.length === 0) return [];

      const { fra, til } = dagensVindu();
      const ider = meks.map((m) => m.id);
      const jobber = await tx
        .select({
          mechanicId: schema.bookings.mechanicId,
          status: schema.bookings.status,
        })
        .from(schema.bookings)
        .where(
          and(
            inArray(schema.bookings.mechanicId, ider),
            gte(schema.bookings.startsAt, fra),
            lt(schema.bookings.startsAt, til),
          ),
        );

      const last = new Map<string, number>();
      for (const j of jobber) {
        if (!j.mechanicId || !tellerSomBelastning(j.status)) continue;
        last.set(j.mechanicId, (last.get(j.mechanicId) ?? 0) + 1);
      }

      const brukerIder = meks.map((m) => m.userId).filter((id): id is string => Boolean(id));
      const profiler =
        brukerIder.length === 0
          ? []
          : await tx
              .select({
                userId: schema.memberProfiles.userId,
                nickname: schema.memberProfiles.nickname,
              })
              .from(schema.memberProfiles)
              .where(
                and(
                  eq(schema.memberProfiles.tenantId, ctx.tenantId),
                  inArray(schema.memberProfiles.userId, brukerIder),
                ),
              );

      const avatarRader =
        brukerIder.length === 0
          ? []
          : await ctx.db
              .select({
                userId: schema.userPreferences.userId,
                avatarShape: schema.userPreferences.avatarShape,
                avatarHumor: schema.userPreferences.avatarHumor,
                avatarHue: schema.userPreferences.avatarHue,
                avatarTone: schema.userPreferences.avatarTone,
              })
              .from(schema.userPreferences)
              .where(inArray(schema.userPreferences.userId, brukerIder))
              .catch(() => []);

      const kallenavn = new Map(profiler.map((p) => [p.userId, p.nickname]));
      const avatarPer = new Map(avatarRader.map((r) => [r.userId, r]));

      return meks
        .map((m) => {
          const jobberIDag = last.get(m.id) ?? 0;
          const vis = mekanikerStatusVisning({
            aktiv: m.active,
            jobberIDag,
            kapasitet: m.capacity,
          });
          return {
            id: m.id,
            name: visningsnavn(
              { navn: m.name, kallenavn: m.userId ? (kallenavn.get(m.userId) ?? null) : null },
              'intern',
            ),
            userId: m.userId,
            active: m.active,
            capacity: m.capacity,
            avatar: m.userId ? lesAvatar(avatarPer.get(m.userId) ?? null) : TOM_AVATAR,
            jobberIDag,
            ...vis,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        capacity: z.number().int().min(1).max(10).default(1),
        // Ferdigheter settes ikke her. De hører til kompetanseregisteret (F3-12)
        // competence.setMechanicSkill — som har rolle-gate og sertifisering.
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.mechanics)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return created;
      }),
    ),

  /**
   * Timeplan — samtidig kapasitet. Samme felt mekanikeren ser som «N av
   * kapasitet» på Min dag. Skriving er leder-arbeid (adminProcedure).
   */
  updateCapacity: adminProcedure
    .input(
      z.object({
        mechanicId: z.uuid(),
        capacity: z.number().int().min(1).max(10),
      }),
    )
    .mutation(({ ctx, input }) => updateMechanicCapacity(ctx.db, ctx.tenantId, input)),

  /**
   * Hvem kan ta denne jobben?
   * Returnerer en rangert liste, ikke ett svar. Booking-motoren (F3-01) eier
   * valget og slot-låsen — matcheren skal aldri kunne dobbeltbooke noen.
   */
  match: protectedProcedure
    .input(
      z.object({
        serviceId: z.uuid(),
        requiredSkills: z.array(z.string()).default([]),
        from: z.coerce.date(),
        to: z.coerce.date(),
        vehicleId: z.uuid().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      createRuleMatcher(ctx.db).match({ ...input, tenantId: ctx.tenantId }),
    ),
});
