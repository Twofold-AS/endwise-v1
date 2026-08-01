import { eraseCustomer, vendorErasureFacts } from '@endwise/modules/erasure';
import { RETENTION_POLICY } from '@endwise/modules/retention';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * F14 — Personvern-flatene.
 *
 * Sletting er `adminProcedure`: kun forhandler-admin kan slette en kunde. En
 * ansatt som kan slette kunder på egen hånd, er en ansatt som kan slette bevis.
 */
export const personvernRouter = router({
  /** F14-03 — Logg-policyen, lesbar for forhandleren. Åpenhet er en del av avtalen. */
  retentionPolicy: protectedProcedure.query(() =>
    RETENTION_POLICY.map((rule) => ({
      table: rule.table,
      days: rule.days,
      basis: rule.basis,
      rationale: rule.rationale,
      access: rule.access,
      mode: rule.mode,
    })),
  ),

  /** F14-16 — Hva leverandørene faktisk lagrer, og hva vi kan slette der. */
  vendorErasureFacts: protectedProcedure.query(() => vendorErasureFacts()),

  /**
   * F14-16 — Slett en kunde (art. 17), gjennom alle ledd.
   *
   * Returnerer en rapport som ÆRLIG sier hva som ikke lot seg slette.
   * Status blir `partial` hvis leverandørlogger fortsatt har data.
   */
  eraseCustomer: adminProcedure
    .input(z.object({ customerId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      eraseCustomer(ctx.db, {
        tenantId: ctx.tenantId,
        customerId: input.customerId,
        requestedBy: ctx.userId,
      }),
    ),
});
