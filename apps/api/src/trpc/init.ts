import { and, eq, schema, withTenant } from '@endwise/db';
import type { AddonModule } from '@endwise/modules';
import { initTRPC, TRPCError } from '@trpc/server';
import type { AppContext } from '../context.ts';
import { resolveShopFlag } from './shop-flag.ts';

/**
 * F0-02 — tRPC v11 for INTERNE flater (admin-/forhandler-dashboard, mekaniker-PWA).
 * Offentlig REST (widget, Quick, webhooks) går via Hono — se src/routes/.
 */
const t = initTRPC.context<AppContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Krever innlogget bruker med tenant-kontekst (håndheves for alvor i F1). */
export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
  const { ctx } = opts;
  if (!ctx.userId || !ctx.tenantId || !ctx.role) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({
    ctx: { ...ctx, userId: ctx.userId, tenantId: ctx.tenantId, role: ctx.role },
  });
});

/**
 * F3-12 — Skriveflater som krever forhandler-admin.
 *
 * RLS svarer på «hvilken tenants rader?». Den vet ingenting om roller. En
 * dealer_staff er medlem av tenanten, så RLS slipper ham inn i dataene — det er
 * BARE denne sjekken som hindrer at han gir seg selv nye ferdigheter.
 */
export const adminProcedure = protectedProcedure.use(function isAdmin(opts) {
  const { ctx } = opts;
  if (ctx.role !== 'dealer_admin' && ctx.role !== 'endwise_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Rollen «${ctx.role}» kan ikke endre dette`,
    });
  }
  return opts.next({ ctx });
});

/**
 * F5-26 — STRENGERE ENN `adminProcedure`, og det er hele poenget.
 *
 * `adminProcedure` slipper inn **både** `dealer_admin` og `endwise_admin`. Det
 * er riktig for «styr ditt eget verksted». Det er feil for alt som gjelder
 * PLATTFORMEN: opprette forhandlere, skru på dev-mode, endre globale flagg.
 * En forhandler skal ikke kunne opprette forhandlere.
 *
 * Fram til nå har hver slik rute gjentatt `if (ctx.role !== 'endwise_admin')`
 * inne i seg selv (se `flags.setGlobal`). Det virker, men en sjekk som må
 * huskes er en sjekk som en dag glemmes. Her er den en type-grense i stedet.
 */
/**
 * F0-16 — MODUL-GATEN. **Dette lukker CWE-862 (Missing Authorization).**
 *
 * RLS svarer på «hvilken tenants rader?». Den vet ingenting om betaling. Fram
 * til nå håndhevet vi entitlements KUN på AI-agent-stien (`assertEntitled` i
 * agent-runtime) — ingen tRPC-prosedyre sjekket modul. En `dealer_admin` uten
 * Butikk- eller Quick-modulen fikk svar ved å kalle ruten direkte; UI-et skjulte
 * bare knappen, og en gjemt knapp er ikke en sperre.
 *
 * ── Tre lag, og de feiler ULIKT ───────────────────────────────────────────
 *
 *   1. **Entitlement** — `tenant_modules` har nøkkelen med `enabled = true`.
 *      Leses fra DB gjennom `withTenant`, **aldri fra klienten**.
 *   2. **Rolle** — `protectedProcedure` under; skriveruter legger
 *      `adminProcedure` på toppen. Å ha kjøpt en modul er ikke det samme som å
 *      ha lov til å endre den.
 *   3. **Skop** — `ctx.tenantId` kommer fra sesjonen (`assertMember`), og
 *      spørringen kjører i `withTenant`. Ingen rute tar imot en tenant-id.
 *
 * ⚠️ **Fail-safe: feiler oppslaget, er svaret NEI.** En tom modulliste er
 * trygg; en antatt-full er det ikke. Samme mønster som `agent.ts` allerede
 * bruker med sin `.catch(() => [])`.
 *
 * ⛔ **Legg ALDRI denne på en basis-rute.** Verkstedet, Innboks, Saker, Kunder,
 * Lager, Helpdesk og Settings er kjerne — se `BASIS_MODULES` i
 * `packages/modules/src/entitlements.ts`. Et verksted som ikke får se sitt eget
 * lager fordi et kort utløp, er et produkt som har misforstått seg selv.
 */
export function moduleProcedure(moduleKey: AddonModule) {
  return protectedProcedure.use(async function hasModule(opts) {
    const { ctx } = opts;

    const moduler = await withTenant(ctx.db, ctx.tenantId as string, (tx) =>
      tx
        .select({ key: schema.tenantModules.moduleKey })
        .from(schema.tenantModules)
        .where(
          and(
            eq(schema.tenantModules.tenantId, ctx.tenantId as string),
            eq(schema.tenantModules.enabled, true),
          ),
        ),
    ).catch(() => [] as Array<{ key: string }>);

    if (!moduler.some((m) => m.key === moduleKey)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Modulen «${moduleKey}» er ikke aktiv for denne forhandleren`,
      });
    }

    return opts.next({ ctx });
  });
}

/** Modul-gate + admin-rolle. For skriveruter i en betalt modul. */
export function moduleAdminProcedure(moduleKey: AddonModule) {
  return moduleProcedure(moduleKey).use(function isAdminToo(opts) {
    const { ctx } = opts;
    if (ctx.role !== 'dealer_admin' && ctx.role !== 'endwise_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Rollen «${ctx.role}» kan ikke endre dette`,
      });
    }
    return opts.next({ ctx });
  });
}

const SHOP_ROLLER = new Set(['dealer_admin', 'dealer_staff', 'endwise_admin', 'endwise_support']);

/**
 * F10-03 — Butikk-gaten. **Ikke `moduleProcedure('shop')`.** Shop ligger i
 * ADDON_MODULES men er IKKE_TILDELBAR — admin kan ikke gi Nettbutikk, og
 * Stripe-abonnementet selger den ikke. Eneste lovlige åpning er feature-flaget
 * `shop` (tenant-overstyring) + vanlig auth/RLS.
 *
 * Fail-safe: flaggoppslag som feiler = AV = FORBIDDEN.
 */
export const shopProcedure = protectedProcedure.use(async function shopFlagOn(opts) {
  const { ctx } = opts;
  const pa = await resolveShopFlag(ctx);
  if (!pa) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Butikk er ikke aktiv for denne forhandleren',
    });
  }
  if (!SHOP_ROLLER.has(ctx.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Rollen «${ctx.role}» kan ikke bruke Butikk`,
    });
  }
  return opts.next({ ctx });
});

export const endwiseAdminProcedure = protectedProcedure.use(function isEndwiseAdmin(opts) {
  const { ctx } = opts;
  if (ctx.role !== 'endwise_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Kun Endwise-admin',
    });
  }
  return opts.next({ ctx });
});

/**
 * Plattform-team: eier, administrator og support.
 * ⛔ Ikke dealer_staff «support». Ikke dealer_admin.
 */
export const endwiseSupportProcedure = protectedProcedure.use(function isEndwiseTeam(opts) {
  const { ctx } = opts;
  if (ctx.role !== 'endwise_admin' && ctx.role !== 'endwise_support') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Kun Endwise-team',
    });
  }
  return opts.next({ ctx });
});

/**
 * Se verkstedet: kun LESING. Mutations 403. Data via slug, ikke sesjon-tenant.
 */
export const endwiseInspectProcedure = endwiseSupportProcedure.use(function kunLesing(opts) {
  if (opts.type === 'mutation') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Kun lesing',
    });
  }
  return opts.next({ ctx: opts.ctx });
});
