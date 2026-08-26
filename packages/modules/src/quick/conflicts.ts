import { and, type Database, eq, schema, sql, withTenant } from '@endwise/db';

/** Kunde-felt Quick eier (og som kan komme i konflikt). Whitelist for resolve. */
const CUSTOMER_FIELDS = new Set(['name', 'email', 'phone']);

export interface ConflictView {
  id: string;
  entity: string;
  entityId: string;
  field: string;
  baseValue: string | null;
  ourValue: string | null;
  theirValue: string | null;
  createdAt: Date;
}

export class ConflictError extends Error {}

/**
 * Konflikt-kø-tjeneste (tre-veis fletting). RLS-scopet: alt via
 * `withTenant`. `list` viser åpne konflikter; `resolve` bruker valget og
 * oppdaterer både konflikten og den underliggende raden + merge-baselinen.
 */
export function createConflictService(db: Database) {
  return {
    /** Åpne konflikter for tenanten (nyeste sist). */
    async listOpen(tenantId: string): Promise<ConflictView[]> {
      return withTenant(db, tenantId, async (tx) => {
        const rows = await tx
          .select()
          .from(schema.syncConflicts)
          .where(eq(schema.syncConflicts.status, 'open'))
          .orderBy(schema.syncConflicts.createdAt);
        return rows.map((r) => ({
          id: r.id,
          entity: r.entity,
          entityId: r.entityId,
          field: r.field,
          baseValue: r.baseValue,
          ourValue: r.ourValue,
          theirValue: r.theirValue,
          createdAt: r.createdAt,
        }));
      });
    },

    /** Antall åpne konflikter (til badge). */
    async openCount(tenantId: string): Promise<number> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.syncConflicts)
          .where(eq(schema.syncConflicts.status, 'open'));
        return row?.n ?? 0;
      });
    },

    /**
     * Løs en konflikt.
     * 'quick': ta Quicks verdi → oppdater raden + avanser baseline til Quick.
     * 'local': behold vår verdi → avanser baseline til Quick (så samme Quick-
     * verdi ikke gjendetekteres), og registrer push-intensjon (push er gated,
     * så ingen automatisk skriving til Quick — kun intensjon).
     * Begge markerer konflikten løst (hvem/hvordan/når).
     */
    async resolve(
      tenantId: string,
      input: { conflictId: string; resolution: 'quick' | 'local'; userId: string },
    ): Promise<void> {
      await withTenant(db, tenantId, async (tx) => {
        const [conflict] = await tx
          .select()
          .from(schema.syncConflicts)
          .where(
            and(
              eq(schema.syncConflicts.id, input.conflictId),
              eq(schema.syncConflicts.status, 'open'),
            ),
          );
        if (!conflict) throw new ConflictError('Konflikten finnes ikke eller er allerede løst');

        // Bruk valget på den underliggende raden (per entitet).
        if (conflict.entity === 'customer') {
          if (!CUSTOMER_FIELDS.has(conflict.field)) {
            throw new ConflictError(`Ukjent kundefelt: ${conflict.field}`);
          }
          const [row] = await tx
            .select()
            .from(schema.customers)
            .where(eq(schema.customers.id, conflict.entityId));
          if (row) {
            const newValue = input.resolution === 'quick' ? conflict.theirValue : conflict.ourValue;
            // Avanser merge-baselinen for feltet til Quicks verdi i begge tilfeller:
            // etter forsoning er Quick-verdien det nye felles utgangspunktet.
            const baseline = {
              ...(row.quickBaseline ?? {}),
              [conflict.field]: conflict.theirValue,
            };
            // Eksplisitt per felt (unngår dynamisk nøkkel i drizzle .set). name er notNull.
            const fieldSet =
              conflict.field === 'name'
                ? { name: newValue ?? row.name }
                : conflict.field === 'email'
                  ? { email: newValue }
                  : { phone: newValue };
            await tx
              .update(schema.customers)
              .set({ ...fieldSet, quickBaseline: baseline, updatedAt: sql`now()` })
              .where(eq(schema.customers.id, conflict.entityId));
          }
        } else {
          throw new ConflictError(`Konfliktløsning for «${conflict.entity}» er ikke støttet ennå`);
        }

        await tx
          .update(schema.syncConflicts)
          .set({
            status: 'resolved',
            resolution: input.resolution,
            resolvedBy: input.userId,
            resolvedAt: sql`now()`,
            // «behold vår» → registrer at verdien bør pushes til Quick (gated).
            pushIntent: input.resolution === 'local' ? 'pending' : null,
            updatedAt: sql`now()`,
          })
          .where(eq(schema.syncConflicts.id, input.conflictId));
      });
    },
  };
}

export type ConflictService = ReturnType<typeof createConflictService>;
