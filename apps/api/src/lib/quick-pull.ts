import type { Database } from '@endwise/db';
import {
  applyQuickDealerProfile,
  createQuickConfigService,
  type QuickCustomerUpsert,
  type QuickPartUpsert,
  type QuickStockUpsert,
  stockFromItemOnHand,
  syncQuickCustomers,
  syncQuickParts,
} from '@endwise/modules/quick';
import {
  createQuickClient,
  mapQuickClientInfo,
  mapQuickCustomer,
  mapQuickItem,
  mapQuickStockEntry,
  QuickError,
  quickPullUserMessage,
} from '@endwise/toolkit-quick';

/**
 * F8-01 / F1-07 — Delt Quick-PULL-orkestrator (Quick → Endwise).
 *
 * Brukes av BÅDE `quick.pullNow` (tRPC, manuell «Hent nå») og cron-jobben
 * (`/cron/quick-pull`, 08:00/16:00 Oslo). Én kilde, samme semantikk.
 *
 * SEMANTIKK: Quick er fakta. Pull OVERSKRIVER våre lokale felt for radene Quick
 * returnerer. GET-only mot Quick. Tokenet forlater aldri serveren.
 *
 * DELTA vs FULL: uten `full` sendes `changedAfterDate = lastSyncedAt`.
 *
 * Client-info (forhandler-profil) kjøres FØR katalog og i egen sti:
 * customer/item/stock-feil ruller IKKE tilbake forhandler-skrivet.
 */

/** Client-apply committes før katalog. Katalog-kast ruller ikke tilbake apply. */
export async function runIndependentOfCatalog<TClient, TCatalog>(opts: {
  applyClient: () => Promise<TClient>;
  pullCatalog: () => Promise<TCatalog>;
}): Promise<{ client: TClient; catalog: TCatalog }> {
  const client = await opts.applyClient();
  const catalog = await opts.pullCatalog();
  return { client, catalog };
}

export interface QuickPullResult {
  ran: boolean;
  upserted?: number;
  customers?: number;
  parts?: number;
  stock?: number;
  batches?: number;
  /** Antall felt-konflikter oppdaget i denne pullen (lagt i konflikt-køen). */
  conflicts?: number;
  /** Grunn til at pull ikke kjørte (f.eks. «ikke konfigurert»). */
  reason?: string;
}

export async function runQuickCustomerPull(
  db: Database,
  tenantId: string,
  opts: { full?: boolean; actorUserId?: string | null } = {},
): Promise<QuickPullResult> {
  const svc = createQuickConfigService(db);
  const cfg = await svc.getDecrypted(tenantId);
  if (!cfg) return { ran: false, reason: 'Quick er ikke konfigurert for denne forhandleren' };

  const view = await svc.getView(tenantId);
  // Markøren settes til da DENNE pullen startet — ikke da den var ferdig — så vi
  // ikke mister endringer som skjer i Quick mens pullen kjører.
  const startedAt = new Date();
  const changedAfterDate = opts.full ? undefined : view.lastSyncedAt?.toISOString();
  const client = createQuickClient(cfg);

  async function* customerUpserts(): AsyncGenerator<QuickCustomerUpsert> {
    for await (const raw of client.iterateCustomers({ changedAfterDate })) {
      yield mapQuickCustomer(raw);
    }
  }

  const itemOnHandFallback: QuickStockUpsert[] = [];

  async function* partUpserts(): AsyncGenerator<QuickPartUpsert> {
    for await (const raw of client.iterateItems({ changedAfterDate })) {
      const mapped = mapQuickItem(raw);
      const fallback = stockFromItemOnHand(mapped);
      if (fallback) itemOnHandFallback.push(fallback);
      yield mapped;
    }
  }

  async function* stockUpserts(): AsyncGenerator<QuickStockUpsert> {
    let any = false;
    try {
      for await (const raw of client.iterateStockEntries({ changedAfterDate })) {
        any = true;
        const mapped = mapQuickStockEntry(raw);
        if (mapped.itemQuickGuid) yield mapped;
      }
    } catch (error) {
      // Ukjent/ikke-aktivert stockentry-sti → bruk inStock på varen. 500 ≠ 404.
      if (!(error instanceof QuickError && error.status === 404)) throw error;
    }
    if (!any) {
      for (const row of itemOnHandFallback) yield row;
    }
  }

  try {
    const { client: dealer, catalog } = await runIndependentOfCatalog({
      applyClient: async () => {
        const info = await client.clientInfo();
        try {
          return await applyQuickDealerProfile(db, tenantId, mapQuickClientInfo(info));
        } catch {
          return { applied: false, mappedKeys: [] as const };
        }
      },
      pullCatalog: async () => {
        const customers = await syncQuickCustomers(db, tenantId, customerUpserts());
        const lager = await syncQuickParts(db, tenantId, partUpserts(), stockUpserts(), {
          actorUserId: opts.actorUserId,
        });
        return { customers, lager };
      },
    });
    const { customers, lager } = catalog;
    const batches = customers.batches + lager.batches;
    const conflictNote = customers.conflicts > 0 ? ` · ${customers.conflicts} konflikt(er)` : '';
    const dealerNote =
      dealer.applied && dealer.mappedKeys.length
        ? ` · forhandler (${dealer.mappedKeys.join(', ')})`
        : '';
    await svc.recordSync(tenantId, {
      status: 'ok',
      detail: `${customers.upserted} kunde(r), ${lager.parts} del(er), ${lager.stock} lagerlinje(r) i ${batches} batch(er)${conflictNote}${dealerNote}`,
      syncedAt: startedAt,
    });
    return {
      ran: true,
      upserted: customers.upserted,
      customers: customers.upserted,
      parts: lager.parts,
      stock: lager.stock,
      batches,
      conflicts: customers.conflicts,
    };
  } catch (error) {
    const detail = quickPullUserMessage(error);
    await svc.recordSync(tenantId, { status: 'error', detail });
    throw error;
  }
}
