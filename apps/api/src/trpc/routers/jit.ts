import { sendEmail } from '@endwise/auth';
import { and, desc, eq, inArray, schema, withPlatformAdmin } from '@endwise/db';
import {
  byggJitVarsel,
  endwiseAktor,
  erAktiv,
  erApen,
  JIT_BEGRUNNELSE_MAX,
  JIT_FEIL,
  type JitRad,
  markerUtlopt,
  nesteEtterAvvisning,
  nesteEtterGodkjenning,
  nesteEtterTrekk,
  vurderBegrunnelse,
  vurderVarighet,
} from '@endwise/modules/jit';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { endwiseAdminProcedure, endwiseSupportProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

const slugInput = z.object({ slug: z.string().min(1).max(80) });
const idInput = z.object({ id: z.uuid() });

type Db = Parameters<typeof withPlatformAdmin>[0];
type Tx = Parameters<Parameters<typeof withPlatformAdmin>[1]>[0];

function feil(kode: 'FORBIDDEN' | 'BAD_REQUEST' | 'NOT_FOUND', melding: string): never {
  throw new TRPCError({ code: kode, message: melding });
}

function somRad(rad: typeof schema.jitGrants.$inferSelect): JitRad {
  return {
    id: rad.id,
    tenantId: rad.tenantId,
    soktAv: rad.soktAv,
    begrunnelse: rad.begrunnelse,
    omfang: rad.omfang as JitRad['omfang'],
    varighetMinutter: rad.varighetMinutter,
    status: rad.status as JitRad['status'],
    godkjenner1: rad.godkjenner1,
    godkjenner2: rad.godkjenner2,
    godkjentAt: rad.godkjentAt,
    utloperAt: rad.utloperAt,
  };
}

async function finnForhandler(db: Db, slug: string) {
  const [t] = await withPlatformAdmin(db, (tx) =>
    tx
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        kind: schema.tenants.kind,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1),
  );
  if (!t || erPlattformTenant(t)) feil('NOT_FOUND', 'Fant ikke forhandleren.');
  return t;
}

async function skrivAudit(
  db: Db,
  input: {
    tenantId: string;
    actor: string;
    action: string;
    subjectId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await withPlatformAdmin(db, (tx) =>
    tx.insert(schema.auditLog).values({
      tenantId: input.tenantId,
      actor: input.actor,
      action: input.action,
      subjectType: input.action.startsWith('inspect.') ? 'inspect' : 'jit_grant',
      subjectId: input.subjectId,
      metadata: { kilde: 'endwise', ...(input.metadata ?? {}) },
    }),
  );
}

async function utlopStale(tx: Tx, rader: Array<typeof schema.jitGrants.$inferSelect>, now: Date) {
  const ut = rader.flatMap((r) => {
    const neste = markerUtlopt(somRad(r), now);
    return neste ? [{ id: r.id, tenantId: r.tenantId, soktAv: r.soktAv }] : [];
  });
  for (const r of ut) {
    await tx
      .update(schema.jitGrants)
      .set({ status: 'utlopt' })
      .where(eq(schema.jitGrants.id, r.id));
  }
  return ut;
}

async function hentGrantsForTenant(tx: Tx, tenantId: string) {
  return tx
    .select()
    .from(schema.jitGrants)
    .where(eq(schema.jitGrants.tenantId, tenantId))
    .orderBy(desc(schema.jitGrants.opprettetAt));
}

async function hentGrant(tx: Tx, id: string) {
  const [rad] = await tx
    .select()
    .from(schema.jitGrants)
    .where(eq(schema.jitGrants.id, id))
    .limit(1);
  return rad ?? null;
}

async function finnLedere(db: Db, tenantId: string) {
  return withPlatformAdmin(db, (tx) =>
    tx
      .select({ email: schema.user.email, name: schema.user.name })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(
        and(eq(schema.member.organizationId, tenantId), eq(schema.member.role, 'dealer_admin')),
      ),
  );
}

async function varsleLeder(input: {
  db: Db;
  tenantId: string;
  grantId: string;
  forhandler: string;
  minutter: number;
  begrunnelse: string;
  utloper: Date;
  aktor: string;
}) {
  const ledere = await finnLedere(input.db, input.tenantId);
  const brev = byggJitVarsel({
    forhandler: input.forhandler,
    minutter: input.minutter,
    begrunnelse: input.begrunnelse,
    utloper: input.utloper,
  });
  let sendt = 0;
  for (const leder of ledere) {
    if (!leder.email) continue;
    try {
      await sendEmail({
        to: leder.email,
        subject: brev.subject,
        text: brev.text,
        idempotencyKey: `jit-varsel-${input.grantId}-${leder.email}`,
      });
      sendt += 1;
    } catch {
      // Fortsett — grant er aktiv. Audit sier om varsel gikk.
    }
  }
  if (sendt > 0) {
    await withPlatformAdmin(input.db, (tx) =>
      tx
        .update(schema.jitGrants)
        .set({ varsletAt: new Date() })
        .where(eq(schema.jitGrants.id, input.grantId)),
    );
  }
  await skrivAudit(input.db, {
    tenantId: input.tenantId,
    actor: input.aktor,
    action: sendt > 0 ? 'jit.varslet' : 'jit.varsel_mangler',
    subjectId: input.grantId,
    metadata: { mottakere: sendt },
  });
}

export async function krevAktivJitSkriv(input: {
  db: Db;
  userId: string;
  tenantId: string;
}): Promise<{ id: string; utloperAt: Date }> {
  krevWhiteLabel();
  const now = new Date();
  const aktiv = await withPlatformAdmin(input.db, async (tx) => {
    const rader = await tx
      .select()
      .from(schema.jitGrants)
      .where(
        and(
          eq(schema.jitGrants.tenantId, input.tenantId),
          eq(schema.jitGrants.soktAv, input.userId),
          inArray(schema.jitGrants.status, ['venter', 'godkjent']),
        ),
      );
    await utlopStale(tx, rader, now);
    const treff = rader.map(somRad).find((r) => r.soktAv === input.userId && erAktiv(r, now));
    return treff;
  });
  if (!aktiv?.utloperAt) feil('FORBIDDEN', 'Kun lesing');
  return { id: aktiv.id, utloperAt: aktiv.utloperAt };
}

export const jitRouter = router({
  oversikt: endwiseSupportProcedure.input(slugInput).query(async ({ ctx, input }) => {
    krevWhiteLabel();
    const t = await finnForhandler(ctx.db, input.slug);
    const now = new Date();
    return withPlatformAdmin(ctx.db, async (tx) => {
      const alle = await hentGrantsForTenant(tx, t.id);
      const utlopt = await utlopStale(tx, alle, now);
      const utloptSett = new Set(utlopt.map((u) => u.id));
      const rader = alle
        .filter((r) => !utloptSett.has(r.id))
        .map(somRad)
        .map((r) => markerUtlopt(r, now) ?? r);
      const mine = rader.filter((r) => r.soktAv === ctx.userId);
      const vente = ctx.role === 'endwise_admin' ? rader.filter((r) => r.status === 'venter') : [];
      const aktiv = mine.find((r) => erAktiv(r, now)) ?? null;
      return { tenant: t, mine, vente, aktiv };
    });
  }),

  sok: endwiseSupportProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(80),
        begrunnelse: z.string().max(JIT_BEGRUNNELSE_MAX),
        varighetMinutter: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      const grunn = vurderBegrunnelse(input.begrunnelse);
      if (!grunn.ok) feil('BAD_REQUEST', grunn.grunn);
      const varighet = vurderVarighet(input.varighetMinutter);
      if (!varighet.ok) feil('BAD_REQUEST', varighet.grunn);
      const t = await finnForhandler(ctx.db, input.slug);
      const now = new Date();
      const id = await withPlatformAdmin(ctx.db, async (tx) => {
        const eksisterende = await tx
          .select()
          .from(schema.jitGrants)
          .where(
            and(
              eq(schema.jitGrants.tenantId, t.id),
              eq(schema.jitGrants.soktAv, ctx.userId),
              inArray(schema.jitGrants.status, ['venter', 'godkjent']),
            ),
          );
        await utlopStale(tx, eksisterende, now);
        const apen = eksisterende.map(somRad).some((r) => erApen(r, now));
        if (apen) feil('BAD_REQUEST', 'Du har allerede en åpen forespørsel.');
        const [rad] = await tx
          .insert(schema.jitGrants)
          .values({
            tenantId: t.id,
            soktAv: ctx.userId,
            begrunnelse: grunn.tekst,
            omfang: 'skriv',
            varighetMinutter: varighet.minutter,
            status: 'venter',
          })
          .returning({ id: schema.jitGrants.id });
        if (!rad) feil('BAD_REQUEST', JIT_FEIL);
        return rad.id;
      });
      await skrivAudit(ctx.db, {
        tenantId: t.id,
        actor: endwiseAktor(ctx.userId),
        action: 'jit.sokt',
        subjectId: id,
        metadata: { minutter: varighet.minutter },
      });
      return { id };
    }),

  godkjenn: endwiseAdminProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    krevWhiteLabel();
    const now = new Date();
    const ut = await withPlatformAdmin(ctx.db, async (tx) => {
      const rad = await hentGrant(tx, input.id);
      if (!rad) feil('NOT_FOUND', JIT_FEIL);
      const neste = nesteEtterGodkjenning({
        rad: somRad(rad),
        godkjennerId: ctx.userId,
        rolle: ctx.role,
        now,
      });
      if (!neste.ok) feil('FORBIDDEN', JIT_FEIL);
      await tx
        .update(schema.jitGrants)
        .set({
          status: neste.neste.status,
          godkjenner1: neste.neste.godkjenner1,
          godkjenner2: neste.neste.godkjenner2,
          godkjentAt: neste.neste.godkjentAt,
          utloperAt: neste.neste.utloperAt,
        })
        .where(eq(schema.jitGrants.id, rad.id));
      const [tenant] = await tx
        .select({ name: schema.tenants.name })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, rad.tenantId))
        .limit(1);
      return { rad, neste, forhandler: tenant?.name ?? 'verkstedet' };
    });
    await skrivAudit(ctx.db, {
      tenantId: ut.rad.tenantId,
      actor: endwiseAktor(ctx.userId),
      action: ut.neste.aktivert ? 'jit.aktivert' : 'jit.godkjent',
      subjectId: ut.rad.id,
      metadata: { nr: ut.neste.aktivert ? 2 : 1 },
    });
    if (ut.neste.aktivert && ut.neste.neste.utloperAt) {
      await varsleLeder({
        db: ctx.db,
        tenantId: ut.rad.tenantId,
        grantId: ut.rad.id,
        forhandler: ut.forhandler,
        minutter: ut.rad.varighetMinutter,
        begrunnelse: ut.rad.begrunnelse,
        utloper: ut.neste.neste.utloperAt,
        aktor: endwiseAktor(ctx.userId),
      });
    }
    return { aktivert: ut.neste.aktivert, utloperAt: ut.neste.neste.utloperAt };
  }),

  avvis: endwiseAdminProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    krevWhiteLabel();
    const tenantId = await withPlatformAdmin(ctx.db, async (tx) => {
      const rad = await hentGrant(tx, input.id);
      if (!rad) feil('NOT_FOUND', JIT_FEIL);
      const neste = nesteEtterAvvisning({
        rad: somRad(rad),
        aktorId: ctx.userId,
        rolle: ctx.role,
      });
      if (!neste.ok) feil('FORBIDDEN', JIT_FEIL);
      await tx
        .update(schema.jitGrants)
        .set({ status: 'avvist', avvistAv: ctx.userId, avvistAt: new Date() })
        .where(eq(schema.jitGrants.id, rad.id));
      return rad.tenantId;
    });
    await skrivAudit(ctx.db, {
      tenantId,
      actor: endwiseAktor(ctx.userId),
      action: 'jit.avvist',
      subjectId: input.id,
    });
    return { ok: true as const };
  }),

  trekk: endwiseSupportProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    krevWhiteLabel();
    const now = new Date();
    const tenantId = await withPlatformAdmin(ctx.db, async (tx) => {
      const rad = await hentGrant(tx, input.id);
      if (!rad) feil('NOT_FOUND', JIT_FEIL);
      const neste = nesteEtterTrekk({
        rad: somRad(rad),
        aktorId: ctx.userId,
        rolle: ctx.role,
        now,
      });
      if (!neste.ok) feil('FORBIDDEN', JIT_FEIL);
      await tx
        .update(schema.jitGrants)
        .set({ status: 'trukket', trukketAv: ctx.userId, trukketAt: now })
        .where(eq(schema.jitGrants.id, rad.id));
      return rad.tenantId;
    });
    await skrivAudit(ctx.db, {
      tenantId,
      actor: endwiseAktor(ctx.userId),
      action: 'jit.trukket',
      subjectId: input.id,
    });
    return { ok: true as const };
  }),
});
