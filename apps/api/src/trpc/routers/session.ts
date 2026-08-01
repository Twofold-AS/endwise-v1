import { eq, schema, withTenant } from '@endwise/db';
import { protectedProcedure, router } from '../init.ts';

/**
 * F1 — «hvem er jeg?» for klient-side rollegating. Rollen kommer fra
 * organization-medlemskapet (assertMember i context). `isMechanic` = brukeren
 * har en mekaniker-profil i tenanten (mechanics.userId) → skal se «Min dag».
 * (Det finnes ingen egen «mekaniker»-rolle; en mekaniker er dealer_staff med
 * en mekaniker-profil.)
 */
export const sessionRouter = router({
  me: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [mech] = await tx
        .select({ id: schema.mechanics.id, name: schema.mechanics.name })
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId));
      return {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        role: ctx.role,
        isMechanic: Boolean(mech),
        mechanicId: mech?.id ?? null,
        mechanicName: mech?.name ?? null,
      };
    }),
  ),
});
