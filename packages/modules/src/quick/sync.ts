import { type Database, inArray, schema, sql, withTenant } from '@endwise/db';
import { QUICK_PROVIDER } from './config.ts';
import { type FieldValue, threeWayMerge } from './merge.ts';

/**
 * Den flate kunde-formen synken skriver. Toolkitet (`mapQuickCustomer`) lager
 * denne fra en rå Quick-kunde; modules-laget forholder seg kun til denne — det
 * holder modules fri for enhver Quick-API-avhengighet (og gjør synken testbar
 * uten HTTP).
 */
export interface QuickCustomerUpsert {
  /** Quick-GUID → customers.quick_guid. Idempotens-nøkkelen. */
  quickGuid: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SyncCustomersResult {
  /** Nye + oppdaterte rader. */
  upserted: number;
  batches: number;
  /** Antall felt-konflikter oppdaget (skrevet til konflikt-køen, ikke overskrevet). */
  conflicts: number;
}

/** Quick-eide kundefelt som flettes tre-veis. */
const MERGE_FIELDS = ['name', 'email', 'phone'] as const;

/**
 * F8-01 — Kundesynk med TRE-VEIS FLETTING (git-lignende, per felt).
 *
 * Kilden er en AsyncIterable (typisk toolkitets `iterateCustomers` mappet til
 * upsert-form). NETTVERKET skjer i iteratoren — UTENFOR DB-transaksjonene: vi
 * buffrer til `batchSize` og skriver hver batch i sin egen korte `withTenant`-
 * transaksjon. Aldri en åpen transaksjon mens vi venter på Quick.
 *
 * FLETTELOGIKK (per felt, mot baseline = sist hentet fra Quick; se merge.ts):
 *   - Quick endret, vi ikke → Quick vinner (auto).
 *   - Vi endret, Quick ikke  → behold vår (auto).
 *   - Begge til samme         → ingen konflikt.
 *   - Begge ulikt             → KONFLIKT: IKKE overskriv, skriv til `sync_conflicts`.
 * Nye rader (ukjent quickGuid): Quick vinner og baseline etableres.
 *
 * BEVISST IKKE rørt (lokale-KUN-felt): `userId` (Min-side-kobling), `createdAt`,
 * kundenotater (egen tabell). Ikke Quick sitt domene.
 *
 * Gjenbruk: `threeWayMerge` + `sync_conflicts` er entitets-agnostiske, så
 * booking/delelager/salg kobler seg på samme mekanikk (egne felt + entity-navn).
 */
export async function syncQuickCustomers(
  db: Database,
  tenantId: string,
  source: AsyncIterable<QuickCustomerUpsert>,
  opts: { batchSize?: number } = {},
): Promise<SyncCustomersResult> {
  const batchSize = opts.batchSize ?? 200;
  let upserted = 0;
  let batches = 0;
  let conflicts = 0;
  let buffer: QuickCustomerUpsert[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const rows = buffer;
    buffer = [];

    await withTenant(db, tenantId, async (tx) => {
      // Hent eksisterende rader for batchens GUID-er (én spørring).
      const guids = rows.map((r) => r.quickGuid);
      const existing = await tx
        .select()
        .from(schema.customers)
        .where(inArray(schema.customers.quickGuid, guids));
      const byGuid = new Map(existing.map((c) => [c.quickGuid, c]));

      for (const r of rows) {
        const theirs: Record<string, FieldValue> = {
          name: r.name,
          email: r.email,
          phone: r.phone,
        };
        const current = r.quickGuid ? byGuid.get(r.quickGuid) : undefined;

        // NY rad: Quick vinner, baseline etableres.
        if (!current) {
          await tx.insert(schema.customers).values({
            tenantId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            source: 'quick',
            quickGuid: r.quickGuid,
            quickBaseline: theirs,
          });
          upserted += 1;
          continue;
        }

        // EKSISTERENDE: tre-veis flett per felt.
        const ours: Record<string, FieldValue> = {
          name: current.name,
          email: current.email,
          phone: current.phone,
        };
        const base = (current.quickBaseline ?? null) as Record<string, FieldValue> | null;
        const {
          merged,
          newBaseline,
          conflicts: fieldConflicts,
        } = threeWayMerge(base, ours, theirs, [...MERGE_FIELDS]);

        await tx
          .update(schema.customers)
          .set({
            // name er notNull → fall tilbake til gjeldende hvis merge gir null.
            name: merged.name ?? current.name,
            email: merged.email,
            phone: merged.phone,
            source: 'quick',
            quickBaseline: newBaseline,
            updatedAt: sql`now()`,
          })
          .where(inArray(schema.customers.quickGuid, [r.quickGuid]));
        upserted += 1;

        // Skriv konfliktene (idempotent: partiell unik på åpne).
        for (const cf of fieldConflicts) {
          conflicts += 1;
          await tx
            .insert(schema.syncConflicts)
            .values({
              tenantId,
              provider: QUICK_PROVIDER,
              entity: 'customer',
              entityId: current.id,
              field: cf.field,
              baseValue: cf.base,
              ourValue: cf.ours,
              theirValue: cf.theirs,
              status: 'open',
            })
            .onConflictDoUpdate({
              target: [
                schema.syncConflicts.tenantId,
                schema.syncConflicts.provider,
                schema.syncConflicts.entity,
                schema.syncConflicts.entityId,
                schema.syncConflicts.field,
              ],
              targetWhere: sql`status = 'open'`,
              set: {
                baseValue: cf.base,
                ourValue: cf.ours,
                theirValue: cf.theirs,
                updatedAt: sql`now()`,
              },
            });
        }
      }
    });
    batches += 1;
  }

  for await (const record of source) {
    buffer.push(record);
    if (buffer.length >= batchSize) await flush();
  }
  await flush();

  return { upserted, batches, conflicts };
}
