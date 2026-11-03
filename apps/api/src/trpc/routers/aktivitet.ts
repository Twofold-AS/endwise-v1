import { desc, eq, schema, withTenant } from '@endwise/db';
import { erEndwiseAktivitet } from '@endwise/modules/jit';
import { z } from 'zod';
import { adminProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

/**
 * F22 / white label F5b — «Aktivitet fra Endwise» for daglig leder.
 * Leser append-only audit_log. Ingen hemmeligheter i metadata.
 */
export const aktivitetRouter = router({
  endwise: adminProcedure
    .input(z.object({ grense: z.number().int().min(1).max(200).optional() }).optional())
    .query(async ({ ctx, input }) => {
      krevWhiteLabel();
      const grense = input?.grense ?? 80;
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const rader = await tx
          .select({
            id: schema.auditLog.id,
            action: schema.auditLog.action,
            actor: schema.auditLog.actor,
            subjectType: schema.auditLog.subjectType,
            occurredAt: schema.auditLog.occurredAt,
            metadata: schema.auditLog.metadata,
          })
          .from(schema.auditLog)
          .where(eq(schema.auditLog.tenantId, ctx.tenantId))
          .orderBy(desc(schema.auditLog.occurredAt))
          .limit(400);
        return rader
          .filter((r) =>
            erEndwiseAktivitet({
              action: r.action,
              actor: r.actor,
              metadata: r.metadata,
            }),
          )
          .slice(0, grense)
          .map((r) => ({
            id: r.id,
            handling: r.action,
            tid: r.occurredAt,
            hva: etikettFor(r.action),
          }));
      });
    }),
});

function etikettFor(action: string): string {
  switch (action) {
    case 'jit.sokt':
      return 'Endwise ba om midlertidig tilgang';
    case 'jit.godkjent':
      return 'Første godkjenning av tilgang';
    case 'jit.aktivert':
      return 'Endwise fikk midlertidig skrive-tilgang';
    case 'jit.avvist':
      return 'Forespørsel om tilgang ble avvist';
    case 'jit.trukket':
      return 'Tilgangen ble trukket tilbake';
    case 'jit.utlopt':
      return 'Tilgangen løp ut';
    case 'jit.varslet':
      return 'Varsel sendt til daglig leder';
    case 'jit.varsel_mangler':
      return 'Varsel kunne ikke sendes';
    case 'inspect.skriv':
      return 'Endwise skrev i verkstedet';
    default:
      return 'Aktivitet fra Endwise';
  }
}
