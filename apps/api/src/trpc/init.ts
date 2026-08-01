import { initTRPC, TRPCError } from '@trpc/server';
import type { AppContext } from '../context.ts';

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
