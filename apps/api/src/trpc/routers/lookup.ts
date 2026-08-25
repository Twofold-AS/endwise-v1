import { eq, schema, withTenant } from '@endwise/db';
import { hentVegvesenApiNokkel } from '@endwise/modules/vegvesen';
import { createVegvesenClient } from '@endwise/toolkit-vegvesen';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { moduleProcedure, router } from '../init.ts';

/**
 * ⛔ F0-16 — MODUL-GATE: `vegvesen`. Hvert oppslag er et kall mot Autosys som
 * KOSTER — å la ruta stå åpen var både et entitlement-hull og en regning.
 */
const vegvesenProcedure = moduleProcedure('vegvesen');

/**
 * F2-08 — Vegvesen-oppslag: regnr → merke/modell/årsmodell/EU-frist.
 *
 * Nøkkelen er per tenant (envelope-kryptert, F1-07) med env som reserve.
 * Oppslaget er et SPEIL: vi lagrer det Vegvesenet sier, og `lookupAt`
 * forteller når. Vi later aldri som at det er vår sannhet. Nøkkelen logges ikke.
 */
export const lookupRouter = router({
  vehicleByRegNumber: vegvesenProcedure
    .input(z.object({ regNumber: z.string().min(2).max(10) }))
    .query(async ({ ctx, input }) => {
      const apiKey = await hentVegvesenApiNokkel(ctx.db, ctx.tenantId);
      if (!apiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Vegvesen-nøkkel mangler. Legg den inn under Innstillinger › Koblinger.',
        });
      }
      return createVegvesenClient({ apiKey }).lookupByRegNumber(input.regNumber);
    }),

  /** Slår opp OG speiler treffet inn på kjøretøyet. */
  refreshVehicle: vegvesenProcedure
    .input(z.object({ vehicleId: z.uuid(), regNumber: z.string().min(2).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await hentVegvesenApiNokkel(ctx.db, ctx.tenantId);
      if (!apiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Vegvesen-nøkkel mangler. Legg den inn under Innstillinger › Koblinger.',
        });
      }

      const data = await createVegvesenClient({ apiKey }).lookupByRegNumber(input.regNumber);
      if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kjøretøyet finnes ikke' });

      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [updated] = await tx
          .update(schema.vehicles)
          .set({
            regNumber: data.regNumber,
            vin: data.vin,
            make: data.make,
            model: data.model,
            modelYear: data.modelYear,
            inspectionDue: data.inspectionDue,
            lookupAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.vehicles.id, input.vehicleId))
          .returning();
        return updated;
      });
    }),
});
