import type { Database } from '@endwise/db';
import {
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
  mapQuickCustomer,
  mapQuickItem,
  mapQuickStockEntry,
  QuickError,
  quickPullUserMessage,
} from '@endwise/toolkit-quick';

/**
 * F8-01 / F1-07 — Delt Quick-pull-orkestrator (Quick → Endwise).
 * Brukes av både `quick.pullNow` (tRPC, manuell «Hent nå») og cron-jobben
 * (`/cron/quick-pull`, 08:00/16:00 Oslo). Én kilde, samme semantikk.
 * Semantikk: Quick er fakta. Pull overskriver våre lokale felt for radene Quick
 * returnerer. GET-only mot Quick. Tokenet forlater aldri serveren.
 * Delta vs full: uten `full` sendes `changedAfterDate = lastSyncedAt`.
 */
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
  // Markøren settes til da denne pullen startet — ikke da den var ferdig — så vi
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
    const customers = await syncQuickCustomers(db, tenantId, customerUpserts());
    const lager = await syncQuickParts(db, tenantId, partUpserts(), stockUpserts(), {
      actorUserId: opts.actorUserId,
    });
    const batches = customers.batches + lager.batches;
    const conflictNote = customers.conflicts > 0 ? ` · ${customers.conflicts} konflikt(er)` : '';
    await svc.recordSync(tenantId, {
      status: 'ok',
      detail: `${customers.upserted} kunde(r), ${lager.parts} del(er), ${lager.stock} lagerlinje(r) i ${batches} batch(er)${conflictNote}`,
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
