import { createWidgetKeyService } from '@endwise/modules/widget';
import { z } from 'zod';
import { moduleAdminProcedure, router } from '../init.ts';

/**
 * ⛔ F0-16 — MODUL-GATE: `widget`. Kundewidgeten er et betalt tillegg.
 *
 * ⚠️ Gjelder KUN nøkkelforvaltningen her. Den OFFENTLIGE widget-flaten
 * (apps/api/src/routes/widget/) har sin egen auth via signert token og skal
 * IKKE ha denne gaten — sluttkunden har ingen sesjon å sjekke moduler mot.
 */
const widgetAdminProcedure = moduleAdminProcedure('widget');

/**
 * F4-02 — Forvaltning av widget-nøkler (dealer_admin). Utstedelse/liste er
 * `adminProcedure` + RLS. Den PUBLISHABLE nøkkelen er offentlig (trygg i Framer);
 * det finnes ingen hemmelig nøkkel å lekke. Den OFFENTLIGE widget-flaten ligger i
 * Hono (`/widget/*`), ikke her — dette er kun admin-siden.
 */
export const widgetRouter = router({
  keys: router({
    list: widgetAdminProcedure.query(({ ctx }) =>
      createWidgetKeyService(ctx.db).list(ctx.tenantId),
    ),

    issue: widgetAdminProcedure
      .input(
        z.object({
          origins: z.array(z.string().url()).min(1).max(20),
          label: z.string().max(80).optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        createWidgetKeyService(ctx.db).issue(ctx.tenantId, {
          origins: input.origins,
          label: input.label,
        }),
      ),
  }),
});
