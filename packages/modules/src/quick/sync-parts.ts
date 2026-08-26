import { and, type Database, eq, inArray, schema, sql, withTenant } from '@endwise/db';

/**
 * Quick-eide lagerfelt. `reserved` er Endwise-lokalt og røres ikke her
 * (unntatt clamping når Quick senker onHand under reserved).
 */
export interface QuickPartUpsert {
  quickGuid: string;
  sku: string;
  name: string;
  unit: string;
  costMinor: number | null;
  active: boolean;
}

export interface QuickStockUpsert {
  itemQuickGuid: string;
  onHand: number;
  locationQuickGuid: string | null;
  locationCode: string;
  locationName: string;
}

export interface SyncPartsResult {
  parts: number;
  locations: number;
  stock: number;
  batches: number;
}

/** Quick vinner onHand. reserved clamps slik at reserved aldri > onHand. */
export function applyQuickOnHand(
  currentOnHand: number,
  currentReserved: number,
  quickOnHand: number,
): { onHand: number; reserved: number; changed: boolean } {
  const onHand = Math.max(0, Math.round(quickOnHand));
  const reserved = Math.min(Math.max(0, currentReserved), onHand);
  return {
    onHand,
    reserved,
    changed: onHand !== currentOnHand || reserved !== currentReserved,
  };
}

const DEFAULT_LOCATION_CODE = 'QUICK';
const DEFAULT_LOCATION_NAME = 'Quick';

/**
 * F8-01 — Deler + beholdning fra Quick inn i lager-tabellene (GET-only pull).
 *
 * NETTVERK skjer i iteratorene — UTENFOR DB-transaksjonene. Quick er FAKTA
 * for sku/navn/enhet/kost/onHand. `reserved` beholdes.
 *
 * ⛔ Ingen `sellPriceMinor` her. Shop-katalogen krever utsalg, men ingen
 * Quick-prisfelt er bekreftet i fixtures/tester/captured responses
 * (kun costPrice/cost i mapping). Ikke finn opp utsalg. Oppfølging: når
 * et live item-felt er sett, map det — ikke før.
 */
export async function syncQuickParts(
  db: Database,
  tenantId: string,
  partsSource: AsyncIterable<QuickPartUpsert>,
  stockSource: AsyncIterable<QuickStockUpsert>,
  opts: { batchSize?: number; actorUserId?: string | null } = {},
): Promise<SyncPartsResult> {
  const batchSize = opts.batchSize ?? 200;
  const actorUserId = opts.actorUserId ?? null;
  let parts = 0;
  let locations = 0;
  let stock = 0;
  let batches = 0;
  const partBuffer: QuickPartUpsert[] = [];

  async function flushParts() {
    if (partBuffer.length === 0) return;
    const rows = partBuffer.splice(0, partBuffer.length);
    await withTenant(db, tenantId, async (tx) => {
      const guids = rows.map((r) => r.quickGuid);
      const existing = await tx
        .select()
        .from(schema.parts)
        .where(inArray(schema.parts.quickGuid, guids));
      const byGuid = new Map(existing.map((p) => [p.quickGuid, p]));
      const skus = rows.map((r) => r.sku);
      const existingSku = await tx
        .select()
        .from(schema.parts)
        .where(inArray(schema.parts.sku, skus));
      const bySku = new Map(existingSku.map((p) => [p.sku, p]));

      for (const r of rows) {
        const current = byGuid.get(r.quickGuid);
        if (current) {
          await tx
            .update(schema.parts)
            .set({
              sku: r.sku,
              name: r.name,
              unit: r.unit,
              costMinor: r.costMinor,
              active: r.active,
              source: 'quick',
              updatedAt: sql`now()`,
            })
            .where(eq(schema.parts.id, current.id));
          parts += 1;
          continue;
        }

        const local = bySku.get(r.sku);
        if (local && !local.quickGuid) {
          await tx
            .update(schema.parts)
            .set({
              name: r.name,
              unit: r.unit,
              costMinor: r.costMinor,
              active: r.active,
              source: 'quick',
              quickGuid: r.quickGuid,
              updatedAt: sql`now()`,
            })
            .where(eq(schema.parts.id, local.id));
          parts += 1;
          continue;
        }

        const sku = local ? `${r.sku}~${r.quickGuid.slice(0, 8)}` : r.sku;
        await tx.insert(schema.parts).values({
          tenantId,
          sku,
          name: r.name,
          unit: r.unit,
          costMinor: r.costMinor,
          active: r.active,
          source: 'quick',
          quickGuid: r.quickGuid,
        });
        parts += 1;
      }
    });
    batches += 1;
  }

  for await (const record of partsSource) {
    if (!record.quickGuid || !record.sku) continue;
    partBuffer.push(record);
    if (partBuffer.length >= batchSize) await flushParts();
  }
  await flushParts();

  const stockBuffer: QuickStockUpsert[] = [];

  async function flushStock() {
    if (stockBuffer.length === 0) return;
    const rows = stockBuffer.splice(0, stockBuffer.length);
    await withTenant(db, tenantId, async (tx) => {
      const itemGuids = [...new Set(rows.map((r) => r.itemQuickGuid).filter(Boolean))];
      const partRows = itemGuids.length
        ? await tx.select().from(schema.parts).where(inArray(schema.parts.quickGuid, itemGuids))
        : [];
      const partByGuid = new Map(partRows.map((p) => [p.quickGuid, p]));

      for (const r of rows) {
        const part = partByGuid.get(r.itemQuickGuid);
        if (!part) continue;

        const location = await ensureLocation(tx, tenantId, r);
        if (location.created) locations += 1;

        const [level] = await tx
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.partId, part.id),
              eq(schema.stockLevels.locationId, location.id),
            ),
          );
        const applied = applyQuickOnHand(level?.onHand ?? 0, level?.reserved ?? 0, r.onHand);
        if (!applied.changed) continue;

        if (level) {
          await tx
            .update(schema.stockLevels)
            .set({
              onHand: applied.onHand,
              reserved: applied.reserved,
              updatedAt: sql`now()`,
            })
            .where(eq(schema.stockLevels.id, level.id));
        } else {
          await tx.insert(schema.stockLevels).values({
            tenantId,
            partId: part.id,
            locationId: location.id,
            onHand: applied.onHand,
            reserved: applied.reserved,
          });
        }

        await tx.insert(schema.stockMovements).values({
          tenantId,
          partId: part.id,
          locationId: location.id,
          kind: 'adjust',
          quantity: applied.onHand,
          actorUserId,
          note: 'Quick-synk',
        });
        stock += 1;
      }
    });
    batches += 1;
  }

  for await (const record of stockSource) {
    if (!record.itemQuickGuid) continue;
    stockBuffer.push(record);
    if (stockBuffer.length >= batchSize) await flushStock();
  }
  await flushStock();

  return { parts, locations, stock, batches };
}

type Tx = Parameters<Parameters<typeof withTenant>[2]>[0];

async function ensureLocation(
  tx: Tx,
  tenantId: string,
  r: QuickStockUpsert,
): Promise<{ id: string; created: boolean }> {
  const code = r.locationCode.trim() || DEFAULT_LOCATION_CODE;
  const name = r.locationName.trim() || DEFAULT_LOCATION_NAME;
  if (r.locationQuickGuid) {
    const [byGuid] = await tx
      .select()
      .from(schema.stockLocations)
      .where(eq(schema.stockLocations.quickGuid, r.locationQuickGuid));
    if (byGuid) {
      if (byGuid.code !== code || byGuid.name !== name) {
        await tx
          .update(schema.stockLocations)
          .set({ code, name })
          .where(eq(schema.stockLocations.id, byGuid.id));
      }
      return { id: byGuid.id, created: false };
    }
  }
  const [byCode] = await tx
    .select()
    .from(schema.stockLocations)
    .where(eq(schema.stockLocations.code, code));
  if (byCode) {
    if (r.locationQuickGuid && !byCode.quickGuid) {
      await tx
        .update(schema.stockLocations)
        .set({ quickGuid: r.locationQuickGuid, name })
        .where(eq(schema.stockLocations.id, byCode.id));
    }
    return { id: byCode.id, created: false };
  }
  const [created] = await tx
    .insert(schema.stockLocations)
    .values({
      tenantId,
      code,
      name,
      quickGuid: r.locationQuickGuid,
    })
    .returning();
  if (!created) throw new Error('Kunne ikke opprette lokasjon');
  return { id: created.id, created: true };
}

/** Fallback når stockentry mangler: onHand fra varen på default-lokasjon. */
export function stockFromItemOnHand(
  item: QuickPartUpsert & { onHand: number | null },
): QuickStockUpsert | null {
  if (item.onHand == null) return null;
  return {
    itemQuickGuid: item.quickGuid,
    onHand: item.onHand,
    locationQuickGuid: null,
    locationCode: DEFAULT_LOCATION_CODE,
    locationName: DEFAULT_LOCATION_NAME,
  };
}
