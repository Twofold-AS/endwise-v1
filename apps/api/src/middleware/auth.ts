import { type Auth, assertMember, type Role, requireSession } from '@endwise/auth';
import { createMiddleware } from 'hono/factory';
import type { AppContext } from '../context.ts';

export interface AuthVars {
  userId: string;
  tenantId: string;
  role: Role;
}

/**
 * F1-03/F1-04 — Auth-middleware.
 * Rekkefølgen er hele poenget:
 * 1. sesjon (inkl. absolutt maks-levetid, F1-12)
 * 2. hvilken tenant ber brukeren om?
 * 3. Er brukeren medlem der? (assertMember)
 * 4. Først da settes app.tenant_id og RLS slipper til data
 * Hopper man over steg 3, vil RLS lydig servere hvilken som helst tenant
 * brukeren finner på å oppgi. RLS beskytter mot lekkasje, ikke mot løgn.
 */
export function authMiddleware(auth: Auth, ctx: AppContext) {
  return createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
    const { user, session } = await requireSession(auth, ctx.db, c.req.raw.headers);

    const requested = c.req.header('x-tenant-id') ?? session.activeOrganizationId;
    if (!requested) return c.json({ error: 'Ingen aktiv tenant' }, 400);

    const role = await assertMember(ctx.db, user.id, requested);

    c.set('userId', user.id);
    c.set('tenantId', requested);
    c.set('role', role);
    await next();
  });
}
