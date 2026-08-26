import { and, eq, schema, sql, withTenant } from '@endwise/db';
import type { Database } from '@endwise/db';
import { TRPCError } from '@trpc/server';

/**
 * F10-03 — Butikk leser lager. Tilgjengelig = onHand − reserved, aldri negativ.
 * ⛔ Ingen kostpris ut her. ⛔ Ingen kundepersonopplysninger i logger (CWE-532).
 */
export function tilgjengeligFra(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export type ShopKatalogRad = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  sellPriceMinor: number;
  onHand: number;
  reserved: number;
  tilgjengelig: number;
};

export async function lesShopKatalog(db: Database, tenantId: string): Promise<ShopKatalogRad[]> {
  return withTenant(db, tenantId, async (tx) => {
    const rader = await tx
      .select({
        id: schema.parts.id,
        sku: schema.parts.sku,
        name: schema.parts.name,
        category: schema.parts.category,
        unit: schema.parts.unit,
        sellPriceMinor: schema.parts.sellPriceMinor,
        onHand: sql<number>`coalesce(sum(${schema.stockLevels.onHand}), 0)::int`,
        reserved: sql<number>`coalesce(sum(${schema.stockLevels.reserved}), 0)::int`,
      })
      .from(schema.parts)
      .leftJoin(
        schema.stockLevels,
        and(eq(schema.stockLevels.partId, schema.parts.id), eq(schema.stockLevels.tenantId, tenantId)),
      )
      .where(
        and(
          eq(schema.parts.tenantId, tenantId),
          eq(schema.parts.active, true),
          sql`${schema.parts.sellPriceMinor} is not null`,
        ),
      )
      .groupBy(schema.parts.id);

    return rader
      .filter((r): r is typeof r & { sellPriceMinor: number } => r.sellPriceMinor != null)
      .map((r) => ({
        ...r,
        tilgjengelig: tilgjengeligFra(r.onHand, r.reserved),
      }));
  });
}

export type ShopLinjeInput = { partId: string; quantity: number };

export async function byggShopLinjer(
  db: Database,
  tenantId: string,
  linjer: ShopLinjeInput[],
): Promise<{
  linjer: Array<{
    partId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    source: string;
  }>;
  totalMinor: number;
}> {
  if (linjer.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Handlekurven er tom' });
  }

  const katalog = await lesShopKatalog(db, tenantId);
  const perId = new Map(katalog.map((r) => [r.id, r]));
  const samlet = new Map<string, number>();
  for (const l of linjer) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ugyldig antall' });
    }
    samlet.set(l.partId, (samlet.get(l.partId) ?? 0) + l.quantity);
  }

  return withTenant(db, tenantId, async (tx) => {
    const ut: Array<{
      partId: string;
      sku: string;
      name: string;
      quantity: number;
      unitPriceMinor: number;
      source: string;
    }> = [];

    for (const [partId, quantity] of samlet) {
      const rad = perId.get(partId);
      if (!rad) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'En del er ikke til salg' });
      }
      if (quantity > rad.tilgjengelig) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Ikke nok på lager av ${rad.sku}`,
        });
      }
      const [del] = await tx
        .select({ source: schema.parts.source })
        .from(schema.parts)
        .where(and(eq(schema.parts.id, partId), eq(schema.parts.tenantId, tenantId)));
      ut.push({
        partId,
        sku: rad.sku,
        name: rad.name,
        quantity,
        unitPriceMinor: rad.sellPriceMinor,
        source: del?.source ?? 'endwise',
      });
    }

    const totalMinor = ut.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
    return { linjer: ut, totalMinor };
  });
}

/**
 * Reserver på Endwise-rader bare. Aldri tilbake til Quick i denne slicen.
 * Velger lokasjonen med mest ledig; hopper over Quick-speilede deler.
 */
export async function reserverShopLinjer(
  tx: Parameters<Parameters<typeof withTenant>[2]>[0],
  tenantId: string,
  actorUserId: string | null,
  linjer: Array<{ partId: string; quantity: number; source: string }>,
): Promise<void> {
  for (const linje of linjer) {
    if (linje.source !== 'endwise') continue;

    const nivaer = await tx
      .select({
        id: schema.stockLevels.id,
        locationId: schema.stockLevels.locationId,
        onHand: schema.stockLevels.onHand,
        reserved: schema.stockLevels.reserved,
      })
      .from(schema.stockLevels)
      .where(
        and(eq(schema.stockLevels.tenantId, tenantId), eq(schema.stockLevels.partId, linje.partId)),
      );

    let gjenstaar = linje.quantity;
    const sortert = [...nivaer].sort(
      (a, b) => tilgjengeligFra(b.onHand, b.reserved) - tilgjengeligFra(a.onHand, a.reserved),
    );

    for (const niva of sortert) {
      if (gjenstaar <= 0) break;
      const ledig = tilgjengeligFra(niva.onHand, niva.reserved);
      if (ledig <= 0) continue;
      const ta = Math.min(ledig, gjenstaar);
      await tx
        .update(schema.stockLevels)
        .set({ reserved: niva.reserved + ta, updatedAt: sql`now()` })
        .where(eq(schema.stockLevels.id, niva.id));
      await tx.insert(schema.stockMovements).values({
        tenantId,
        partId: linje.partId,
        locationId: niva.locationId,
        kind: 'reserve',
        quantity: ta,
        actorUserId,
        note: 'Butikk-ordre',
      });
      gjenstaar -= ta;
    }
  }
}

export async function markerShopOrdreBetalt(
  db: Database,
  tenantId: string,
  input: { checkoutSessionId: string; paymentIntentId: string | null },
): Promise<{ ok: boolean; alreadyPaid: boolean }> {
  return withTenant(db, tenantId, async (tx) => {
    const [ordre] = await tx
      .select()
      .from(schema.shopOrders)
      .where(
        and(
          eq(schema.shopOrders.tenantId, tenantId),
          eq(schema.shopOrders.stripeCheckoutSessionId, input.checkoutSessionId),
        ),
      );
    if (!ordre) return { ok: false, alreadyPaid: false };
    if (ordre.status === 'paid') return { ok: true, alreadyPaid: true };

    const linjer = await tx
      .select({
        partId: schema.shopOrderLines.partId,
        quantity: schema.shopOrderLines.quantity,
        source: schema.parts.source,
      })
      .from(schema.shopOrderLines)
      .innerJoin(schema.parts, eq(schema.parts.id, schema.shopOrderLines.partId))
      .where(
        and(
          eq(schema.shopOrderLines.orderId, ordre.id),
          eq(schema.shopOrderLines.tenantId, tenantId),
        ),
      );

    await reserverShopLinjer(tx, tenantId, ordre.createdByUserId, linjer);

    await tx
      .update(schema.shopOrders)
      .set({
        status: 'paid',
        paidAt: sql`now()`,
        stripePaymentIntentId: input.paymentIntentId,
      })
      .where(eq(schema.shopOrders.id, ordre.id));

    return { ok: true, alreadyPaid: false };
  });
}
