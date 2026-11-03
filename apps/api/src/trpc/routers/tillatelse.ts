import { authEnv, verifiserFerskTotpForBruker } from '@endwise/auth';
import { and, eq, schema, sql, withTenant } from '@endwise/db';
import {
  kanLedeHandling,
  OMRADER,
  TILLATELSE_FEIL,
  vurderTildeling,
} from '@endwise/modules/tillatelse';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

function feil(melding = TILLATELSE_FEIL): never {
  throw new TRPCError({ code: 'FORBIDDEN', message: melding });
}

export const tillatelseRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    krevWhiteLabel();
    if (ctx.role === 'dealer_admin' || ctx.role === 'endwise_admin') {
      return OMRADER.map((omrade) => ({ omrade, niva: 'endre' as const }));
    }
    return withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select({
          omrade: schema.memberPermissions.omrade,
          niva: schema.memberPermissions.niva,
        })
        .from(schema.memberPermissions)
        .where(
          and(
            eq(schema.memberPermissions.tenantId, ctx.tenantId),
            eq(schema.memberPermissions.userId, ctx.userId),
          ),
        ),
    );
  }),

  liste: adminProcedure.query(async ({ ctx }) => {
    krevWhiteLabel();
    if (!kanLedeHandling(ctx.role)) feil();
    return withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select({
          userId: schema.memberPermissions.userId,
          omrade: schema.memberPermissions.omrade,
          niva: schema.memberPermissions.niva,
          gittAv: schema.memberPermissions.gittAv,
          gittAt: schema.memberPermissions.gittAt,
        })
        .from(schema.memberPermissions)
        .where(eq(schema.memberPermissions.tenantId, ctx.tenantId)),
    );
  }),

  sett: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1).max(80),
        omrade: z.enum(OMRADER),
        niva: z.enum(['se', 'endre']).nullable(),
        totp: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      if (ctx.authSone !== 'platform') {
        await verifiserFerskTotpForBruker(ctx.db, ctx.userId, input, authEnv.secret);
      }
      const sjekk = vurderTildeling({
        aktorRolle: ctx.role,
        aktorId: ctx.userId,
        malUserId: input.userId,
        omrade: input.omrade,
        niva: input.niva,
      });
      if (!sjekk.ok) feil(sjekk.grunn);
      await ctx.db.execute(
        sql`select tildel_tillatelse(${ctx.tenantId}::uuid, ${ctx.userId}::text, ${input.userId}::text, ${input.omrade}::text, ${input.niva}::text)`,
      );
      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: input.niva ? 'tillatelse.gitt' : 'tillatelse.fjernet',
          subjectType: 'member_permission',
          subjectId: input.userId,
          metadata: { omrade: input.omrade, niva: input.niva },
        }),
      );
      return { ok: true as const };
    }),

  rapport: adminProcedure.query(async ({ ctx }) => {
    krevWhiteLabel();
    if (ctx.role !== 'endwise_admin') feil();
    const res = await ctx.db.execute(
      sql`select organization_id, antall from rapport_flere_dealer_admin()`,
    );
    return (res.rows ?? res) as Array<{ organization_id: string; antall: number }>;
  }),
});
