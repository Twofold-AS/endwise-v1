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
 * F8-01 / F1-07 — Delt Quick-pull-orkestrator (Quick → Endwise).
 * Brukes av både `quick.pullNow` (tRPC, manuell «Hent nå») og cron-jobben
 * (`/cron/quick-pull`, 08:00/16:00 Oslo). Én kilde, samme semantikk.
 * Semantikk: Quick er fakta. Pull overskriver våre lokale felt for radene Quick
 * returnerer. GET-only mot Quick. Tokenet forlater aldri serveren.
 * Delta vs full: uten `full` sendes `changedAfterDate = lastSyncedAt`.
 * Client-info (forhandler-profil) kjøres før katalog og i egen sti:
 * customer/item/stock-feil ruller ikke tilbake forhandler-skrivet.
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

export type QuickPullEntity = 'customer' | 'item' | 'stock';

export interface QuickPullEntityError {
  entity: QuickPullEntity;
  kind: 'schema' | 'network' | 'persist';
  message: string;
}

export interface QuickPullResult {
  ran: boolean;
  ok?: boolean;
  partial?: boolean;
  upserted?: number;
  customers?: number;
  parts?: number;
  stock?: number;
  batches?: number;
  /** Antall felt-konflikter oppdaget i denne pullen (lagt i konflikt-køen). */
  conflicts?: number;
  errors?: QuickPullEntityError[];
  /** Grunn til at pull ikke kjørte (f.eks. «ikke konfigurert»). */
  reason?: string;
}

export function classifyQuickPullError(error: unknown): QuickPullEntityError['kind'] {
  if (error instanceof QuickError) {
    if (/svarformat/i.test(error.message)) return 'schema';
    if (/nådde ikke|tidsavbrudd/i.test(error.message)) return 'network';
    if (error.status !== undefined && error.status >= 400) return 'network';
  }
  return 'persist';
}

/** Kjører customer/item/stock hver for seg. Én feil stopper ikke de andre. */
export async function runIsolatedEntities<TCustomer, TItem, TStock>(tasks: {
  customer?: () => Promise<TCustomer>;
  item?: () => Promise<TItem>;
  stock?: () => Promise<TStock>;
}): Promise<{
  results: { customer?: TCustomer; item?: TItem; stock?: TStock };
  errors: QuickPullEntityError[];
}> {
  const results: { customer?: TCustomer; item?: TItem; stock?: TStock } = {};
  const errors: QuickPullEntityError[] = [];

  async function runOne<T>(
    entity: QuickPullEntity,
    task: (() => Promise<T>) | undefined,
    assign: (value: T) => void,
  ): Promise<void> {
    if (!task) return;
    try {
      assign(await task());
    } catch (error) {
      errors.push({
        entity,
        kind: classifyQuickPullError(error),
        message: quickPullUserMessage(error),
      });
    }
  }

  await runOne('customer', tasks.customer, (value) => {
    results.customer = value;
  });
  await runOne('item', tasks.item, (value) => {
    results.item = value;
  });
  await runOne('stock', tasks.stock, (value) => {
    results.stock = value;
  });
  return { results, errors };
}

async function* emptyQuickRows(): AsyncGenerator<never> {}

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
        const actor = { actorUserId: opts.actorUserId };
        return runIsolatedEntities({
          customer: () => syncQuickCustomers(db, tenantId, customerUpserts()),
          item: () => syncQuickParts(db, tenantId, partUpserts(), emptyQuickRows(), actor),
          stock: () => syncQuickParts(db, tenantId, emptyQuickRows(), stockUpserts(), actor),
        });
      },
    });
    const customers = catalog.results.customer;
    const parts = catalog.results.item;
    const stock = catalog.results.stock;
    const errors = catalog.errors;
    const customerCount = customers?.upserted ?? 0;
    const partCount = parts?.parts ?? 0;
    const stockCount = stock?.stock ?? 0;
    const batches = (customers?.batches ?? 0) + (parts?.batches ?? 0) + (stock?.batches ?? 0);
    const conflicts = customers?.conflicts ?? 0;
    const persisted = customerCount + partCount + stockCount > 0 || dealer.applied;
    const partial = errors.length > 0 && persisted;
    const status = errors.length === 0 ? 'ok' : persisted ? 'partial' : 'error';
    const conflictNote = conflicts > 0 ? ` · ${conflicts} konflikt(er)` : '';
    const dealerNote =
      dealer.applied && dealer.mappedKeys.length
        ? ` · forhandler (${dealer.mappedKeys.join(', ')})`
        : '';
    const errorNote = errors.length ? ` · ${errors.map((e) => e.message).join(' ')}` : '';
    await svc.recordSync(tenantId, {
      status,
      detail: `${customerCount} kunde(r), ${partCount} del(er), ${stockCount} lagerlinje(r) i ${batches} batch(er)${conflictNote}${dealerNote}${errorNote}`,
      syncedAt: persisted ? startedAt : undefined,
    });
    return {
      ran: true,
      ok: errors.length === 0,
      partial,
      upserted: customerCount,
      customers: customerCount,
      parts: partCount,
      stock: stockCount,
      batches,
      conflicts,
      errors,
    };
  } catch (error) {
    const detail = quickPullUserMessage(error);
    await svc.recordSync(tenantId, { status: 'error', detail });
    return {
      ran: true,
      ok: false,
      partial: false,
      errors: [{ entity: 'customer', kind: classifyQuickPullError(error), message: detail }],
    };
  }
}
