import { authEnv, sendInvitation } from '@endwise/auth';
import { and, asc, eq, schema, withTenant } from '@endwise/db';
import { createInvitasjonsmodul, InvitasjonUgyldigError } from '@endwise/modules/invitasjoner';
import {
  erPlattformTenant,
  kanFjerneEllerEndreNiva,
  kanSePlatformTeam,
  resolvePlatformNiva,
  rolleForPlatformNiva,
} from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { endwiseAdminProcedure, router } from '../init.ts';

type TenantRad = { id: string; name: string; slug: string; kind: string };

async function lesAktivTenant(
  db: import('@endwise/db').Database,
  tenantId: string,
): Promise<TenantRad | null> {
  const [t] = await withTenant(db, tenantId, (tx) =>
    tx
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        kind: schema.tenants.kind,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1),
  );
  return t ?? null;
}

async function finnEier(db: import('@endwise/db').Database, tenantId: string) {
  const [rad] = await db
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, tenantId), eq(schema.member.role, 'endwise_admin')))
    .orderBy(asc(schema.member.createdAt))
    .limit(1);
  return rad?.userId ?? null;
}

function krevPlattformOgStyring(tenant: TenantRad | null, rolle: string) {
  if (!tenant || !erPlattformTenant(tenant)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Team-siden gjelder bare Endwise-plattformen.',
    });
  }
  if (rolle === 'endwise_support' || !kanSePlatformTeam('administrator')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Support har ikke tilgang til team.' });
  }
}

/**
 * Plattform-team. Tre nivåer på Endwise-org. Eier kan ikke fjernes i UI.
 */
export const platformTeamRouter = router({
  list: endwiseAdminProcedure.query(async ({ ctx }) => {
    const tenant = await lesAktivTenant(ctx.db, ctx.tenantId);
    krevPlattformOgStyring(tenant, ctx.role);
    const eierId = await finnEier(ctx.db, ctx.tenantId);

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

    return medlemmer
      .map((m) => {
        const erEier = m.userId === eierId;
        const niva = resolvePlatformNiva({ rolle: m.rolle, erEier });
        return {
          userId: m.userId,
          navn: m.navn,
          epost: m.epost,
          rolle: m.rolle,
          niva,
          erEier,
          hovedAdmin: erEier,
          kanEndres: kanFjerneEllerEndreNiva({
            erEier,
            userId: m.userId,
            kallendeUserId: ctx.userId,
          }),
        };
      })
      .sort((a, b) => {
        if (a.erEier) return -1;
        if (b.erEier) return 1;
        return (a.navn ?? '').localeCompare(b.navn ?? '', 'nb');
      });
  }),

  invitasjoner: endwiseAdminProcedure.query(async ({ ctx }) => {
    const tenant = await lesAktivTenant(ctx.db, ctx.tenantId);
    krevPlattformOgStyring(tenant, ctx.role);
    return createInvitasjonsmodul(ctx.db).listApnePlatform(ctx.tenantId);
  }),

  inviter: endwiseAdminProcedure
    .input(
      z.object({
        epost: z.email().max(200),
        niva: z.enum(['administrator', 'support']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesAktivTenant(ctx.db, ctx.tenantId);
      krevPlattformOgStyring(tenant, ctx.role);
      const modul = createInvitasjonsmodul(ctx.db);
      let resultat: Awaited<ReturnType<typeof modul.opprettPlatform>>;
      try {
        resultat = await modul.opprettPlatform({
          tenantId: ctx.tenantId,
          epost: input.epost,
          niva: input.niva,
          invitedBy: ctx.userId,
        });
      } catch (error) {
        if (error instanceof InvitasjonUgyldigError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }

      const base = authEnv.baseUrl;
      const lenke = `${base.replace(/\/$/, '')}/invitasjon/${resultat.token}`;
      let sendt = true;
      try {
        await sendInvitation({
          to: resultat.invitasjon.epost,
          lenke,
          forhandler: 'Endwise',
          funksjon: input.niva,
          kind: 'platform',
          platformLevel: input.niva,
          utloper: resultat.invitasjon.utloper,
        });
      } catch (error) {
        sendt = false;
        console.error(`[platform-team] e-post feilet: ${(error as Error).message}`);
      }

      return {
        id: resultat.invitasjon.id,
        epost: resultat.invitasjon.epost,
        niva: input.niva,
        sendt,
      };
    }),

  settNiva: endwiseAdminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        niva: z.enum(['administrator', 'support']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesAktivTenant(ctx.db, ctx.tenantId);
      krevPlattformOgStyring(tenant, ctx.role);
      const eierId = await finnEier(ctx.db, ctx.tenantId);
      if (
        !kanFjerneEllerEndreNiva({
          erEier: input.userId === eierId,
          userId: input.userId,
          kallendeUserId: ctx.userId,
        })
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Eier kan ikke endres eller fjernes.',
        });
      }

      const [medlem] = await ctx.db
        .select({ id: schema.member.id })
        .from(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, ctx.tenantId),
            eq(schema.member.userId, input.userId),
          ),
        );
      if (!medlem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Personen er ikke i Endwise-teamet.' });
      }

      await ctx.db
        .update(schema.member)
        .set({ role: rolleForPlatformNiva(input.niva) })
        .where(
          and(
            eq(schema.member.organizationId, ctx.tenantId),
            eq(schema.member.userId, input.userId),
          ),
        );
      return { userId: input.userId, niva: input.niva };
    }),
});
