import { randomBytes } from 'node:crypto';
import {
  authEnv,
  BEDRIFT_CSRF_HEADER,
  bedriftUtloperAt,
  brukerHarPasskey,
  byggSesjonKake,
  IDLE_TIMEOUT_SECONDS,
  KONTEKST_AUDIT,
  kanAapneBedrift,
  verifiserFerskTotpForBruker,
} from '@endwise/auth';
import { and, type Database, eq, schema, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

async function harRolleHos(db: Database, tenantId: string, userId: string) {
  const [m] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, tenantId)))
    .limit(1);
  return Boolean(m && (m.role === 'dealer_admin' || m.role === 'dealer_staff'));
}

export const kontekstRouter = router({
  meg: publicProcedure.query(({ ctx }) => {
    return {
      kontekst: ctx.kontekst,
      harRolle: ctx.role === 'dealer_admin' || ctx.role === 'dealer_staff',
      csrfHeader: BEDRIFT_CSRF_HEADER,
    };
  }),

  bytt: protectedProcedure
    .input(
      z.object({
        til: z.enum(['privat', 'bedrift']),
        totp: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      if (!ctx.tenantId || !ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Du er ikke innlogget.' });
      }
      const til = input.til;
      const rolleOk = await harRolleHos(ctx.db, ctx.tenantId, ctx.userId);
      if (til === 'bedrift') {
        const harPasskey = await brukerHarPasskey(ctx.db, ctx.userId);
        if (!kanAapneBedrift({ harRolle: rolleOk, harPasskey })) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Bedrift krever rolle og passnøkkel.',
          });
        }
        await verifiserFerskTotpForBruker(ctx.db, ctx.userId, input, authEnv.secret);
      } else if (!rolleOk && ctx.role !== 'customer') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ikke tillatt' });
      }

      const now = new Date();
      const nyToken = randomBytes(32).toString('hex');
      const cookie = ctx.requestHeaders.get('cookie') ?? '';
      const gammel = cookie.match(/(?:__Host-|__Secure-)?endwise\.session_token=([^;]+)/)?.[1];

      await ctx.db
        .update(schema.session)
        .set({
          token: nyToken,
          kontekst: til,
          activeOrganizationId: ctx.tenantId,
          bedriftVerifisertAt: til === 'bedrift' ? now : null,
          bedriftUtloperAt: til === 'bedrift' ? bedriftUtloperAt(now, now) : null,
          expiresAt: new Date(
            now.getTime() + (til === 'bedrift' ? 30 * 60 * 1000 : IDLE_TIMEOUT_SECONDS * 1000),
          ),
          updatedAt: now,
        })
        .where(
          gammel
            ? eq(schema.session.token, gammel)
            : and(
                eq(schema.session.userId, ctx.userId),
                eq(schema.session.activeOrganizationId, ctx.tenantId),
              ),
        );

      ctx.setAuthCookie?.(
        byggSesjonKake({
          token: nyToken,
          prod: process.env.NODE_ENV === 'production',
          maxAgeSekunder: til === 'bedrift' ? 30 * 60 : IDLE_TIMEOUT_SECONDS,
        }),
      );

      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: KONTEKST_AUDIT,
          subjectType: 'session',
          subjectId: ctx.userId,
          metadata: { fra: ctx.kontekst, til },
        }),
      );

      return { kontekst: til, landing: til === 'bedrift' ? '/home' : '/min-side' };
    }),
});
