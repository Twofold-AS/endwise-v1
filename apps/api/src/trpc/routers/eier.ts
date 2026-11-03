import { authEnv, sendEmail, verifiserFerskTotpForBruker } from '@endwise/auth';
import { and, eq, schema, sql, withPlatformAdmin, withTenant } from '@endwise/db';
import {
  EIER_OVERFOR_FEIL,
  kanStarteNod,
  kanUtforeNod,
  nesteNodGodkjenning,
  nodUtforEtter,
  OWNER_TRANSFER_AUDIT,
  rensTillatelser,
} from '@endwise/modules/eier-overforing';
import { OMRADER } from '@endwise/modules/tillatelse';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, endwiseAdminProcedure, protectedProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

function feil(kode: 'FORBIDDEN' | 'BAD_REQUEST' | 'NOT_FOUND' = 'FORBIDDEN'): never {
  throw new TRPCError({ code: kode, message: EIER_OVERFOR_FEIL });
}

const tillatelserInput = z.record(z.enum(OMRADER), z.enum(['se', 'endre'])).optional();

async function lesStedfortreder(
  db: Parameters<typeof withTenant>[0],
  tenantId: string,
  userId: string,
) {
  const [rad] = await withTenant(db, tenantId, (tx) =>
    tx
      .select({ ok: schema.memberProfiles.stedfortreder })
      .from(schema.memberProfiles)
      .where(
        and(eq(schema.memberProfiles.tenantId, tenantId), eq(schema.memberProfiles.userId, userId)),
      )
      .limit(1),
  );
  return rad?.ok === true;
}

async function lesRolle(db: Parameters<typeof withTenant>[0], tenantId: string, userId: string) {
  const [m] = await withTenant(db, tenantId, (tx) =>
    tx
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(and(eq(schema.member.organizationId, tenantId), eq(schema.member.userId, userId)))
      .limit(1),
  );
  return m?.role ?? null;
}

async function lesEpost(db: Parameters<typeof withTenant>[0], userId: string) {
  const [u] = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return u ?? { email: null, name: null };
}

async function utforBytte(input: {
  db: Parameters<typeof withTenant>[0];
  tenantId: string;
  fra: string;
  til: string;
  tillatelser: ReturnType<typeof rensTillatelser>;
  actor: string;
  action: string;
}) {
  await input.db.execute(
    sql`select overfor_daglig_leder(${input.tenantId}::uuid, ${input.fra}::text, ${input.til}::text)`,
  );
  for (const [omrade, niva] of Object.entries(input.tillatelser)) {
    await input.db.execute(
      sql`select tildel_tillatelse(${input.tenantId}::uuid, ${input.til}::text, ${input.fra}::text, ${omrade}::text, ${niva}::text)`,
    );
  }
  await withTenant(input.db, input.tenantId, (tx) =>
    tx.insert(schema.auditLog).values({
      tenantId: input.tenantId,
      actor: input.actor,
      action: input.action,
      subjectType: 'owner_transfer',
      subjectId: input.til,
      metadata: { fra: input.fra, til: input.til },
    }),
  );
  const [fra, til] = await Promise.all([
    lesEpost(input.db, input.fra),
    lesEpost(input.db, input.til),
  ]);
  if (fra.email) {
    await sendEmail({
      to: fra.email,
      subject: 'Daglig leder er overført',
      text: 'Rollen som daglig leder er overført. Dine økter er avsluttet.',
    }).catch(() => undefined);
  }
  if (til.email) {
    await sendEmail({
      to: til.email,
      subject: 'Du er daglig leder',
      text: 'Du er nå daglig leder. Sett opp tofaktor hvis du ikke har det.',
    }).catch(() => undefined);
  }
}

export const eierRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    krevWhiteLabel();
    const stedfortreder = await lesStedfortreder(ctx.db, ctx.tenantId, ctx.userId);
    const [sted] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select({ userId: schema.memberProfiles.userId })
        .from(schema.memberProfiles)
        .where(
          and(
            eq(schema.memberProfiles.tenantId, ctx.tenantId),
            eq(schema.memberProfiles.stedfortreder, true),
          ),
        )
        .limit(1),
    );
    const [apen] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select()
        .from(schema.ownerTransfers)
        .where(
          and(
            eq(schema.ownerTransfers.tenantId, ctx.tenantId),
            sql`${schema.ownerTransfers.status} in ('venter','godkjent')`,
          ),
        )
        .limit(1),
    );
    return {
      erLeder: ctx.role === 'dealer_admin',
      erStedfortreder: stedfortreder,
      stedfortrederUserId: sted?.userId ?? null,
      apen: apen
        ? {
            id: apen.id,
            kind: apen.kind,
            status: apen.status,
            tilUserId: apen.tilUserId,
            utforEtter: apen.utforEtter,
          }
        : null,
    };
  }),

  settStedfortreder: adminProcedure
    .input(z.object({ userId: z.string().min(1).max(80), totp: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      if (ctx.authSone !== 'platform') {
        await verifiserFerskTotpForBruker(ctx.db, ctx.userId, input, authEnv.secret);
      }
      if (input.userId === ctx.userId) feil();
      const rolle = await lesRolle(ctx.db, ctx.tenantId, input.userId);
      if (rolle !== 'dealer_staff') feil('BAD_REQUEST');
      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        await tx
          .update(schema.memberProfiles)
          .set({ stedfortreder: false })
          .where(eq(schema.memberProfiles.tenantId, ctx.tenantId));
        await tx
          .insert(schema.memberProfiles)
          .values({
            tenantId: ctx.tenantId,
            userId: input.userId,
            stedfortreder: true,
          })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            set: { stedfortreder: true, updatedAt: new Date() },
          });
      });
      return { userId: input.userId };
    }),

  overfor: adminProcedure
    .input(
      z.object({
        tilUserId: z.string().min(1).max(80),
        tillatelser: tillatelserInput,
        totp: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      if (ctx.role !== 'dealer_admin') feil();
      await verifiserFerskTotpForBruker(ctx.db, ctx.userId, input, authEnv.secret);
      if (input.tilUserId === ctx.userId) feil();
      const [til] = await ctx.db
        .select({ twoFactorEnabled: schema.user.twoFactorEnabled })
        .from(schema.user)
        .where(eq(schema.user.id, input.tilUserId))
        .limit(1);
      if (til?.twoFactorEnabled !== true) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Ny daglig leder må ha tofaktor.',
        });
      }
      const tillatelser = rensTillatelser(input.tillatelser ?? {});
      await utforBytte({
        db: ctx.db,
        tenantId: ctx.tenantId,
        fra: ctx.userId,
        til: input.tilUserId,
        tillatelser,
        actor: ctx.userId,
        action: OWNER_TRANSFER_AUDIT.utfort,
      });
      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx.insert(schema.ownerTransfers).values({
          tenantId: ctx.tenantId,
          kind: 'frivillig',
          status: 'utfort',
          fraUserId: ctx.userId,
          tilUserId: input.tilUserId,
          tillatelser,
          soktAv: ctx.userId,
          utfortAt: new Date(),
        }),
      );
      return { ok: true };
    }),

  nodStart: protectedProcedure
    .input(
      z.object({
        tenantId: z.uuid().optional(),
        tilUserId: z.string().min(1).max(80),
        begrunnelse: z.string().trim().min(8).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      const tenantId = input.tenantId ?? ctx.tenantId;
      const erEndwise = ctx.role === 'endwise_admin' && ctx.authSone === 'platform';
      const stedfortreder = erEndwise
        ? false
        : await lesStedfortreder(ctx.db, tenantId, ctx.userId);
      if (!kanStarteNod({ erEndwiseAdmin: erEndwise, erStedfortreder: stedfortreder })) {
        feil();
      }
      const [leder] = await withTenant(ctx.db, tenantId, (tx) =>
        tx
          .select({ userId: schema.member.userId })
          .from(schema.member)
          .where(
            and(eq(schema.member.organizationId, tenantId), eq(schema.member.role, 'dealer_admin')),
          )
          .limit(1),
      );
      if (!leder || leder.userId === input.tilUserId) feil('BAD_REQUEST');
      const now = new Date();
      const [rad] = await withTenant(ctx.db, tenantId, (tx) =>
        tx
          .insert(schema.ownerTransfers)
          .values({
            tenantId,
            kind: 'nod',
            status: 'venter',
            fraUserId: leder.userId,
            tilUserId: input.tilUserId,
            begrunnelse: input.begrunnelse,
            soktAv: ctx.userId,
            varsletAt: now,
            utforEtter: nodUtforEtter(now),
          })
          .returning({ id: schema.ownerTransfers.id }),
      );
      await withTenant(ctx.db, tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId,
          actor: ctx.userId,
          action: OWNER_TRANSFER_AUDIT.nodStart,
          subjectType: 'owner_transfer',
          subjectId: rad?.id ?? tenantId,
        }),
      );
      const gammel = await lesEpost(ctx.db, leder.userId);
      if (gammel.email) {
        await sendEmail({
          to: gammel.email,
          subject: 'Varsel: nød-overføring av daglig leder',
          text: `En nød-overføring er startet. Den kan tidligst gjennomføres om ${7} dager.`,
        }).catch(() => undefined);
      }
      return { id: rad?.id, utforEtter: nodUtforEtter(now) };
    }),

  nodGodkjenn: endwiseAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      const [rad] = await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .select()
          .from(schema.ownerTransfers)
          .where(eq(schema.ownerTransfers.id, input.id))
          .limit(1),
      );
      if (!rad || rad.kind !== 'nod' || rad.status !== 'venter') feil('NOT_FOUND');
      const neste = nesteNodGodkjenning({
        aktorId: ctx.userId,
        godkjenner1: rad.godkjenner1,
        godkjenner2: rad.godkjenner2,
      });
      if (!neste.ok) feil();
      const begge = neste.felt === 'godkjenner2';
      await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .update(schema.ownerTransfers)
          .set({
            [neste.felt]: ctx.userId,
            status: begge ? 'godkjent' : 'venter',
          })
          .where(eq(schema.ownerTransfers.id, input.id)),
      );
      await withPlatformAdmin(ctx.db, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: rad.tenantId,
          actor: ctx.userId,
          action: OWNER_TRANSFER_AUDIT.nodGodkjent,
          subjectType: 'owner_transfer',
          subjectId: rad.id,
          metadata: { felt: neste.felt },
        }),
      );
      return { id: rad.id, status: begge ? 'godkjent' : 'venter' };
    }),

  nodUtfor: endwiseAdminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      const [rad] = await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .select()
          .from(schema.ownerTransfers)
          .where(eq(schema.ownerTransfers.id, input.id))
          .limit(1),
      );
      if (!rad) feil('NOT_FOUND');
      if (
        !kanUtforeNod({
          status: rad.status,
          godkjenner1: rad.godkjenner1,
          godkjenner2: rad.godkjenner2,
          utforEtter: rad.utforEtter,
        })
      ) {
        feil();
      }
      await utforBytte({
        db: ctx.db,
        tenantId: rad.tenantId,
        fra: rad.fraUserId,
        til: rad.tilUserId,
        tillatelser: rensTillatelser(rad.tillatelser),
        actor: ctx.userId,
        action: OWNER_TRANSFER_AUDIT.nodUtfort,
      });
      await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .update(schema.ownerTransfers)
          .set({ status: 'utfort', utfortAt: new Date() })
          .where(eq(schema.ownerTransfers.id, input.id)),
      );
      return { ok: true };
    }),
});
