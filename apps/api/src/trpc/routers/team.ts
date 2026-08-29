import { randomUUID } from 'node:crypto';
import { createAuth, sendTwoFactorOtp } from '@endwise/auth';
import { and, desc, eq, gte, inArray, lt, schema, withTenant } from '@endwise/db';
import {
  type Jobbfunksjon,
  kanEndreJobbfunksjon,
  kanTildeles,
  lesAvatar,
  mekanikerStatusVisning,
  resolveJobbfunksjon,
  synkMekanikerRad,
  TILDELBARE_FUNKSJONER,
  tellerSomBelastning,
} from '@endwise/modules/profil';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router, staffProcedure } from '../init.ts';
import {
  hashTeamBekreftelse,
  kodeMatcher,
  nyBekreftelseskode,
  TEAM_BEKREFTELSE_TTL_MS,
  teamBekreftelseId,
} from './team-bekreftelse.ts';

/** Ikke-ruterbar adresse når lederen ikke oppgir e-post. Aldri send dit. */
const UTEN_INNLOGGING_SUFFIKS = '@uten-innlogging.invalid';

function erUtenInnloggingEpost(epost: string): boolean {
  return epost.endsWith(UTEN_INNLOGGING_SUFFIKS);
}

function dagensVindu(): { fra: Date; til: Date } {
  const fra = new Date();
  fra.setHours(0, 0, 0, 0);
  const til = new Date(fra);
  til.setDate(til.getDate() + 1);
  return { fra, til };
}

/**
 * Team & tilgang: hvem jobber her, og hva gjør de?
 * Hele ruteren er `adminProcedure`
 * Ikke bare mutasjonen. Lista over kollegaer med navn, e-post, rolle og
 * funksjon er et personregister over verkstedet — den hører til lederen, ikke
 * til hvem som helst som er innlogget. En `dealer_staff` som kunne lese den,
 * kunne kartlagt hele huset uten å ha noe der å gjøre.
 * To dimensjoner, aldri blandet
 * Ruta endrer `job_function` (landing) og synker `mechanics` (tildelbarhet).
 * Den rører **aldri** `member.role` — å bytte noens tilgangsnivå er en annen
 * og langt farligere handling, og skal ikke kunne skje ved et uhell fra en
 * nedtrekksliste som heter «Funksjon».
 */
export const teamRouter = router({
  /**
   * Alle medlemmer i tenanten, med utledet jobbfunksjon.
   * `member` og `user` har ingen RLS (ADR-002), så isolasjonen må komme fra
   * spørringen selv: `organization_id = ctx.tenantId`. Samme grep som
   * `directory.participants` — se doc-kommentaren der for hvorfor det er
   * viktigere enn det ser ut.
   */
  list: staffProcedure.query(async ({ ctx }) => {
    const medlemmer = await ctx.db
      .select({
        userId: schema.member.userId,
        rolle: schema.member.role,
        navn: schema.user.name,
        epost: schema.user.email,
        twoFactorEnabled: schema.user.twoFactorEnabled,
        createdAt: schema.member.createdAt,
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
     * `user_preferences` har ingen RLS. Isolasjonen kommer av at
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

    /**
     * Innlogging krever credential-konto (passord). Lokal oppretting uten
     * invitasjon lager aldri den raden — personen vises i teamet, men kan
     * ikke logge inn. Invitasjonsstien (F1-10) er uendret.
     */
    const kontoer = await ctx.db
      .select({ userId: schema.account.userId })
      .from(schema.account)
      .where(and(inArray(schema.account.userId, ider), eq(schema.account.providerId, 'credential')))
      .catch(() => []);

    const profilPer = new Map(profiler.map((p) => [p.userId, p]));
    const avatarPer = new Map(avatarRader.map((r) => [r.userId, r]));
    const medInnlogging = new Set(kontoer.map((k) => k.userId));
    const mekPerBruker = new Map(
      mekanikere.filter((m) => m.userId).map((m) => [m.userId as string, m]),
    );
    const erMekaniker = new Set(mekPerBruker.keys());

    return medlemmer
      .map((m) => {
        const p = profilPer.get(m.userId);
        const mek = mekPerBruker.get(m.userId);
        const jobberIDag = mek ? (jobberPerMek.get(mek.id) ?? 0) : 0;
        const vis = mek
          ? mekanikerStatusVisning({
              aktiv: mek.active,
              jobberIDag,
              kapasitet: mek.capacity,
            })
          : { status: null, statusHumor: null, statusLabel: null };
        return {
          userId: m.userId,
          navn: m.navn,
          epost: erUtenInnloggingEpost(m.epost) ? '' : m.epost,
          kanLoggeInn: medInnlogging.has(m.userId),
          rolle: m.rolle,
          ansattSiden: m.createdAt,
          jobberIDag,
          /** Kallenavn er internt. Team & tilgang er en intern flate. */
          kallenavn: p?.nickname ?? null,
          funksjon: resolveJobbfunksjon({
            rolle: m.rolle,
            lagret: (p?.jobFunction as Jobbfunksjon | null) ?? null,
            harMekanikerprofil: erMekaniker.has(m.userId),
          }),
          /** Er funksjonen satt eksplisitt, eller utledet? Vises i UI-et. */
          eksplisitt: Boolean(p?.jobFunction),
          harMekanikerprofil: erMekaniker.has(m.userId),
          mechanicId: mek?.id ?? null,
          twoFactorEnabled: Boolean(m.twoFactorEnabled),
          /** Ledere kan ikke få tildelt funksjon — den følger av rollen. */
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
   * Fire sperrer, og hver enkelt fanger en egen feil:
   * 1. `adminProcedure` — kun dealer_admin/endwise_admin i det hele tatt.
   * 2. `kanEndreJobbfunksjon(ctx.role)` — eksplisitt sjekk, ikke bare en
   * antagelse om hva `adminProcedure` slipper gjennom. Endres den ene,
   * står den andre igjen.
   * 3. **Målpersonen må være medlem av denne tenanten.** Uten denne kunne en
   * leder sendt en vilkårlig bruker-ID og skrevet en profilrad for en
   * ansatt hos en annen forhandler (CWE-639 / owasp A01). RLS ville stoppet
   * lesingen, men innskrivingen ville hatt vår egen tenant-id og altså
   * vært lovlig — det er nettopp derfor medlemskapet må sjekkes her.
   * 4. Funksjonen må være tildelbar. `leder` avvises: den følger av rollen.
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

      const [bruker] = await ctx.db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, input.userId));

      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        await tx
          .insert(schema.memberProfiles)
          .values({ tenantId: ctx.tenantId, userId: input.userId, jobFunction: input.funksjon })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            // Kun funksjonen. Kallenavnet er personens eget og skal ikke
            // nullstilles fordi lederen endret hva de jobber med.
            set: { jobFunction: input.funksjon, updatedAt: new Date() },
          });
        // Landing = job_function. Tildelbarhet = mechanics-rad (active).
        // Uten denne synken blir personen synlig på Ansatte og kan lande
        // på /min-dag, men usynlig i jobbpicker (list/match).
        await synkMekanikerRad(tx, {
          tenantId: ctx.tenantId,
          userId: input.userId,
          funksjon: input.funksjon,
          navn: bruker?.name ?? 'Mekaniker',
        });
      });
      return { userId: input.userId, funksjon: input.funksjon };
    }),

  /**
   * F1-10 tillegg — legg til ansatt uten invitasjon.
   * Verkstedet som ikke trenger mekaniker-PWA (eller som vil ha navnet i
   * forhandlervisningen før noen logger inn) må kunne opprette selger /
   * support / mekaniker lokalt. Ingen e-post sendes. Ingen invitasjonsrad.
   * Ingen passord — admin setter aldri passord for andre (samme regel som
   * F1-10). Personen vises i teamet; innlogging skjer bare via invitasjon.
   * Rollen er alltid `dealer_staff`. `leder` avvises. Tenant kommer fra
   * sesjonen. Eksisterende e-post avvises — da skal invitasjonsstien brukes.
   */
  opprettUtenInvitasjon: adminProcedure
    .input(
      z.object({
        navn: z.string().trim().min(1).max(160),
        epost: z.email().max(200).optional(),
        funksjon: z.enum(['selger', 'support', 'mekaniker']),
        /** Samme felt som `mechanics.create` / Timeplan — samtidige jobber. */
        capacity: z.number().int().min(1).max(10).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan legge til ansatte.',
        });
      }
      if (!kanTildeles(input.funksjon)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Funksjonen «${input.funksjon}» kan ikke tildeles.`,
        });
      }

      const oppgitt = input.epost?.trim().toLowerCase();
      if (oppgitt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Bruk invitasjon når personen skal logge inn. Ikke opprett en konto uten passord på en ekte e-post.',
        });
      }
      const epost = `u-${randomUUID()}${UTEN_INNLOGGING_SUFFIKS}`;

      const userId = randomUUID();
      let mechanicId: string | null = null;

      try {
        await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          await tx.insert(schema.user).values({
            id: userId,
            name: input.navn,
            email: epost,
            emailVerified: false,
            twoFactorEnabled: false,
          });
          await tx.insert(schema.member).values({
            id: randomUUID(),
            organizationId: ctx.tenantId,
            userId,
            role: 'dealer_staff',
            createdAt: new Date(),
          });
          await tx.insert(schema.memberProfiles).values({
            tenantId: ctx.tenantId,
            userId,
            jobFunction: input.funksjon,
          });
          mechanicId = await synkMekanikerRad(tx, {
            tenantId: ctx.tenantId,
            userId,
            funksjon: input.funksjon,
            navn: input.navn,
            capacity: input.capacity,
          });
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Klarte ikke legge til den ansatte. Prøv igjen, eller bruk en annen e-post.',
        });
      }

      return {
        userId,
        navn: input.navn,
        epost: oppgitt ?? '',
        funksjon: input.funksjon,
        kanLoggeInn: false,
        mechanicId,
      };
    }),

  /**
   * Planlagte jobber — bookinger knyttet til mekanikerprofilen.
   * Selger/support uten mekanikerprofil får ærlig tom liste.
   */
  jobber: staffProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertMedlem(ctx, input.userId);
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [mek] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(
            and(
              eq(schema.mechanics.tenantId, ctx.tenantId),
              eq(schema.mechanics.userId, input.userId),
            ),
          );
        if (!mek) return [];

        const fra = new Date();
        fra.setDate(fra.getDate() - 30);
        return tx
          .select({
            id: schema.bookings.id,
            status: schema.bookings.status,
            startsAt: schema.bookings.startsAt,
            endsAt: schema.bookings.endsAt,
            regNumber: schema.vehicles.regNumber,
            serviceName: schema.services.name,
          })
          .from(schema.bookings)
          .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
          .leftJoin(
            schema.serviceVersions,
            eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
          )
          .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
          .where(and(eq(schema.bookings.mechanicId, mek.id), gte(schema.bookings.startsAt, fra)))
          .orderBy(desc(schema.bookings.startsAt))
          .limit(12);
      });
    }),

  /**
   * Oppdater lagret e-post på eksisterende bruker. Ingen ny identitet.
   * To-stegs changeEmail (F1-27) er for egen profil — her handler lederen
   * på en ansatt i tenanten.
   */
  endreEpost: adminProcedure
    .input(z.object({ userId: z.string().min(1), epost: z.email().max(200) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan endre e-post.',
        });
      }
      await assertMedlem(ctx, input.userId);
      const epost = input.epost.trim().toLowerCase();
      const [finnes] = await ctx.db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, epost))
        .limit(1);
      if (finnes && finnes.id !== input.userId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'E-posten er allerede i bruk.',
        });
      }
      await ctx.db
        .update(schema.user)
        .set({ email: epost, emailVerified: false, updatedAt: new Date() })
        .where(eq(schema.user.id, input.userId));
      return { userId: input.userId, epost };
    }),

  /**
   * Trigger eksisterende Better-Auth passordreset mot den ansattes e-post.
   */
  sendPassordendring: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan sende passordendring.',
        });
      }
      const medlem = await assertMedlem(ctx, input.userId);
      if (!medlem.epost || erUtenInnloggingEpost(medlem.epost)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Personen har ingen e-post. Inviter hen hvis hen skal ha innlogging.',
        });
      }
      const [konto] = await ctx.db
        .select({ id: schema.account.id })
        .from(schema.account)
        .where(
          and(eq(schema.account.userId, input.userId), eq(schema.account.providerId, 'credential')),
        );
      if (!konto) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Personen har ingen innlogging. Send en invitasjon i stedet.',
        });
      }
      const auth = createAuth(ctx.db);
      await auth.api.requestPasswordReset({ body: { email: medlem.epost } });
      return { sendt: true };
    }),

  /**
   * Steg 1: send engangskode til lederens e-post. Ingenting slås av her.
   */
  slaAv2faStart: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan slå av 2FA.',
        });
      }
      const mal = await assertMedlem(ctx, input.userId);
      if (!mal.twoFactorEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA er ikke på for denne personen.',
        });
      }
      const [leder] = await ctx.db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, ctx.userId));
      if (!leder?.email || erUtenInnloggingEpost(leder.email)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vi fant ingen e-post å sende bekreftelseskoden til.',
        });
      }
      const kode = nyBekreftelseskode();
      const ident = teamBekreftelseId(ctx.tenantId, ctx.userId, input.userId);
      await ctx.db.delete(schema.verification).where(eq(schema.verification.identifier, ident));
      await ctx.db.insert(schema.verification).values({
        id: randomUUID(),
        identifier: ident,
        value: hashTeamBekreftelse(kode),
        expiresAt: new Date(Date.now() + TEAM_BEKREFTELSE_TTL_MS),
      });
      await sendTwoFactorOtp(leder.email, kode);
      return { sendt: true };
    }),

  /**
   * Steg 2: koden må stemme. Én klikk slår aldri av 2FA.
   */
  slaAv2fa: adminProcedure
    .input(z.object({ userId: z.string().min(1), kode: z.string().trim().min(4).max(12) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan slå av 2FA.',
        });
      }
      await assertMedlem(ctx, input.userId);
      const ident = teamBekreftelseId(ctx.tenantId, ctx.userId, input.userId);
      const [rad] = await ctx.db
        .select({
          id: schema.verification.id,
          value: schema.verification.value,
          expiresAt: schema.verification.expiresAt,
        })
        .from(schema.verification)
        .where(eq(schema.verification.identifier, ident));
      if (!rad || rad.expiresAt.getTime() < Date.now() || !kodeMatcher(rad.value, input.kode)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ugyldig eller utløpt bekreftelseskode. Be om en ny kode.',
        });
      }
      await ctx.db.delete(schema.verification).where(eq(schema.verification.id, rad.id));
      await ctx.db
        .update(schema.user)
        .set({ twoFactorEnabled: false, updatedAt: new Date() })
        .where(eq(schema.user.id, input.userId));
      await ctx.db.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, input.userId));
      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'two_factor.disabled',
          subjectType: 'user',
          subjectId: input.userId,
          metadata: { via: 'team', av: ctx.userId },
        }),
      );
      return { userId: input.userId, twoFactorEnabled: false };
    }),

  /**
   * Fjern fra teamet. Mekaniker deaktiveres (`active = false`).
   * Brukeren slettes ikke — produktet deaktiverer, det hard-sletter ikke.
   */
  fjern: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan fjerne ansatte.',
        });
      }
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Du kan ikke fjerne deg selv.',
        });
      }
      const medlem = await assertMedlem(ctx, input.userId);
      if (kanEndreJobbfunksjon(medlem.rolle)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ledere fjernes ikke herfra.',
        });
      }
      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        await tx
          .update(schema.mechanics)
          .set({ active: false })
          .where(
            and(
              eq(schema.mechanics.tenantId, ctx.tenantId),
              eq(schema.mechanics.userId, input.userId),
            ),
          );
        await tx
          .delete(schema.memberProfiles)
          .where(
            and(
              eq(schema.memberProfiles.tenantId, ctx.tenantId),
              eq(schema.memberProfiles.userId, input.userId),
            ),
          );
      });
      await ctx.db
        .delete(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, ctx.tenantId),
            eq(schema.member.userId, input.userId),
          ),
        );
      return { userId: input.userId, deaktivert: true };
    }),
});

async function assertMedlem(
  ctx: { db: import('@endwise/db').Database; tenantId: string },
  userId: string,
): Promise<{ rolle: string; epost: string; twoFactorEnabled: boolean }> {
  const [medlem] = await ctx.db
    .select({
      rolle: schema.member.role,
      epost: schema.user.email,
      twoFactorEnabled: schema.user.twoFactorEnabled,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(and(eq(schema.member.organizationId, ctx.tenantId), eq(schema.member.userId, userId)));
  if (!medlem) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Personen er ikke medlem av denne forhandleren.',
    });
  }
  return {
    rolle: medlem.rolle,
    epost: medlem.epost,
    twoFactorEnabled: Boolean(medlem.twoFactorEnabled),
  };
}
