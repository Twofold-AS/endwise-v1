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
  if (!ctx.userId || !ctx.tenantId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({ ctx: { ...ctx, userId: ctx.userId, tenantId: ctx.tenantId } });
});
