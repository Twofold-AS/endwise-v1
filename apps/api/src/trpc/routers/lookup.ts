import { eq, schema, withTenant } from '@endwise/db';
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
 * Nøkkelen er per tenant (envelope-kryptert, F1-07) — her leses den fra miljøet
 * til den er på plass i DB. Oppslaget er et SPEIL: vi lagrer det Vegvesenet sier,
 * og `lookupAt` forteller når. Vi later aldri som at det er vår sannhet.
 */
export const lookupRouter = router({
  vehicleByRegNumber: vegvesenProcedure
    .input(z.object({ regNumber: z.string().min(2).max(10) }))
    .query(async ({ input }) => {
      const apiKey = process.env.VEGVESEN_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'VEGVESEN_API_KEY mangler',
        });
      }
      return createVegvesenClient({ apiKey }).lookupByRegNumber(input.regNumber);
    }),

  /** Slår opp OG speiler treffet inn på kjøretøyet. */
  refreshVehicle: vegvesenProcedure
    .input(z.object({ vehicleId: z.uuid(), regNumber: z.string().min(2).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.VEGVESEN_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'VEGVESEN_API_KEY mangler' });
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
