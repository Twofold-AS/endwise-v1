import { and, eq, gte, inArray, lt, schema, withTenant } from '@endwise/db';
import {
  type Jobbfunksjon,
  kanEndreJobbfunksjon,
  kanTildeles,
  lesAvatar,
  mekanikerStatusVisning,
  resolveJobbfunksjon,
  TILDELBARE_FUNKSJONER,
  tellerSomBelastning,
} from '@endwise/modules/profil';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../init.ts';

function dagensVindu(): { fra: Date; til: Date } {
  const fra = new Date();
  fra.setHours(0, 0, 0, 0);
  const til = new Date(fra);
  til.setDate(til.getDate() + 1);
  return { fra, til };
}

/**
 * F1-14 — TEAM & TILGANG: hvem jobber her, og hva gjør de?
 *
 * ── ⛔ Hele ruteren er `adminProcedure` ──────────────────────────────────
 * Ikke bare mutasjonen. Lista over kollegaer med navn, e-post, rolle og
 * funksjon er et personregister over verkstedet — den hører til lederen, ikke
 * til hvem som helst som er innlogget. En `dealer_staff` som kunne lese den,
 * kunne kartlagt hele huset uten å ha noe der å gjøre.
 *
 * ── To dimensjoner, aldri blandet ────────────────────────────────────────
 * Ruta ENDRER kun `job_function`. Den rører **aldri** `member.role` — å bytte
 * noens tilgangsnivå er en annen og langt farligere handling, og skal ikke
 * kunne skje ved et uhell fra en nedtrekksliste som heter «Funksjon».
 */
export const teamRouter = router({
  /**
   * Alle medlemmer i tenanten, med utledet jobbfunksjon.
   *
   * ⚠️ `member` og `user` har ingen RLS (ADR-002), så isolasjonen må komme fra
   * spørringen selv: `organization_id = ctx.tenantId`. Samme grep som
   * `directory.participants` — se doc-kommentaren der for hvorfor det er
   * viktigere enn det ser ut.
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const medlemmer = await ctx.db
      .select({
        userId: schema.member.userId,
        rolle: schema.member.role,
        navn: schema.user.name,
        epost: schema.user.email,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(eq(schema.member.organizationId, ctx.tenantId));

    if (medlemmer.length === 0) return [];
    const ider = medlemmer.map((m) => m.userId);

    // Profiler + mekanikerprofiler, tenant-skopet av RLS.
    const { profiler, mekanikere, jobberPerMek } = await withTenant(
      ctx.db,
      ctx.tenantId,
      async (tx) => {
        const profiler = await tx
          .select({
            userId: schema.memberProfiles.userId,
            jobFunction: schema.memberProfiles.jobFunction,
            nickname: schema.memberProfiles.nickname,
          })
          .from(schema.memberProfiles)
          .where(
            and(
              eq(schema.memberProfiles.tenantId, ctx.tenantId),
              inArray(schema.memberProfiles.userId, ider),
            ),
          );
        const mekanikere = await tx
          .select({
            id: schema.mechanics.id,
            userId: schema.mechanics.userId,
            active: schema.mechanics.active,
            capacity: schema.mechanics.capacity,
          })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.tenantId, ctx.tenantId));

        const jobberPerMek = new Map<string, number>();
        const mekIder = mekanikere.map((m) => m.id);
        if (mekIder.length > 0) {
          const { fra, til } = dagensVindu();
          const jobber = await tx
            .select({
              mechanicId: schema.bookings.mechanicId,
              status: schema.bookings.status,
            })
            .from(schema.bookings)
            .where(
              and(
                inArray(schema.bookings.mechanicId, mekIder),
                gte(schema.bookings.startsAt, fra),
                lt(schema.bookings.startsAt, til),
              ),
            );
          for (const j of jobber) {
            if (!j.mechanicId || !tellerSomBelastning(j.status)) continue;
            jobberPerMek.set(j.mechanicId, (jobberPerMek.get(j.mechanicId) ?? 0) + 1);
          }
        }
        return { profiler, mekanikere, jobberPerMek };
      },
    ).catch(() => ({
      profiler: [] as {
        userId: string;
        jobFunction: string | null;
        nickname: string | null;
      }[],
      mekanikere: [] as {
        id: string;
        userId: string | null;
        active: boolean;
        capacity: number;
      }[],
      jobberPerMek: new Map<string, number>(),
    }));

    /**
     * F6-19 — `user_preferences` har ingen RLS. Isolasjonen kommer av at
     * `ider` allerede er tenant-skopet via `member.organization_id`.
     */
    const avatarRader = await ctx.db
      .select({
        userId: schema.userPreferences.userId,
        avatarShape: schema.userPreferences.avatarShape,
        avatarHumor: schema.userPreferences.avatarHumor,
        avatarHue: schema.userPreferences.avatarHue,
        avatarTone: schema.userPreferences.avatarTone,
      })
      .from(schema.userPreferences)
      .where(inArray(schema.userPreferences.userId, ider))
      .catch(() => []);

    const profilPer = new Map(profiler.map((p) => [p.userId, p]));
    const avatarPer = new Map(avatarRader.map((r) => [r.userId, r]));
    const mekPerBruker = new Map(
      mekanikere.filter((m) => m.userId).map((m) => [m.userId as string, m]),
    );
    const erMekaniker = new Set(mekPerBruker.keys());

    return medlemmer
      .map((m) => {
        const p = profilPer.get(m.userId);
        const mek = mekPerBruker.get(m.userId);
        const vis = mek
          ? mekanikerStatusVisning({
              aktiv: mek.active,
              jobberIDag: jobberPerMek.get(mek.id) ?? 0,
              kapasitet: mek.capacity,
            })
          : { status: null, statusHumor: null, statusLabel: null };
        return {
          userId: m.userId,
          navn: m.navn,
          epost: m.epost,
          rolle: m.rolle,
          /** ⚠️ Kallenavn er INTERNT. Team & tilgang er en intern flate. */
          kallenavn: p?.nickname ?? null,
          funksjon: resolveJobbfunksjon({
            rolle: m.rolle,
            lagret: (p?.jobFunction as Jobbfunksjon | null) ?? null,
            harMekanikerprofil: erMekaniker.has(m.userId),
          }),
          /** Er funksjonen satt eksplisitt, eller utledet? Vises i UI-et. */
          eksplisitt: Boolean(p?.jobFunction),
          harMekanikerprofil: erMekaniker.has(m.userId),
          /** ⛔ Ledere kan ikke få tildelt funksjon — den følger av rollen. */
          kanEndres: !kanEndreJobbfunksjon(m.rolle),
          /**
           * Seed for ansatte er `user.id`. Mekanikerlista (`/mekanikere`)
           * seeder på `mechanics.id` — to flater, to IDer, med vilje.
           */
          avatar: lesAvatar(avatarPer.get(m.userId) ?? null),
          ...vis,
        };
      })
      .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
  }),

  /**
   * Sett jobbfunksjon på et medlem.
   *
   * ⛔ Fire sperrer, og hver enkelt fanger en egen feil:
   *   1. `adminProcedure` — kun dealer_admin/endwise_admin i det hele tatt.
   *   2. `kanEndreJobbfunksjon(ctx.role)` — eksplisitt sjekk, ikke bare en
   *      antagelse om hva `adminProcedure` slipper gjennom. Endres den ene,
   *      står den andre igjen.
   *   3. **Målpersonen må være medlem av DENNE tenanten.** Uten denne kunne en
   *      leder sendt en vilkårlig bruker-ID og skrevet en profilrad for en
   *      ansatt hos en annen forhandler (CWE-639 / OWASP A01). RLS ville stoppet
   *      lesingen, men innskrivingen ville hatt vår egen tenant-id og altså
   *      vært lovlig — det er nettopp derfor medlemskapet må sjekkes her.
   *   4. Funksjonen må være TILDELBAR. `leder` avvises: den følger av rollen.
   */
  setFunction: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        funksjon: z.enum(['selger', 'support', 'mekaniker']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan endre jobbfunksjon.',
        });
      }
      if (!kanTildeles(input.funksjon)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Funksjonen «${input.funksjon}» kan ikke tildeles. Gyldige: ${TILDELBARE_FUNKSJONER.join(', ')}.`,
        });
      }

      const [medlem] = await ctx.db
        .select({ rolle: schema.member.role })
        .from(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, ctx.tenantId),
            eq(schema.member.userId, input.userId),
          ),
        );
      if (!medlem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Personen er ikke medlem av denne forhandleren.',
        });
      }
      if (kanEndreJobbfunksjon(medlem.rolle)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Ledere har funksjonen «leder», som følger av tilgangsnivået. Endre tilgangsnivået i stedet.',
        });
      }

      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .insert(schema.memberProfiles)
          .values({ tenantId: ctx.tenantId, userId: input.userId, jobFunction: input.funksjon })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            // ⚠️ Kun funksjonen. Kallenavnet er personens eget og skal ikke
            // nullstilles fordi lederen endret hva de jobber med.
            set: { jobFunction: input.funksjon, updatedAt: new Date() },
          }),
      );
      return { userId: input.userId, funksjon: input.funksjon };
    }),
});
