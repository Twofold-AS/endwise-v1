import type { Database } from '@endwise/db';
import {
  createQuickConfigService,
  type QuickCustomerUpsert,
  syncQuickCustomers,
} from '@endwise/modules/quick';
import { createQuickClient, mapQuickCustomer } from '@endwise/toolkit-quick';

/**
 * F8-01 — Delt Quick-PULL-orkestrator (Quick → Endwise).
 *
 * Brukes av BÅDE `quick.pullNow` (tRPC, manuell «Hent nå») og cron-jobben
 * (`/cron/quick-pull`, 08:00/16:00 Oslo). Én kilde, samme semantikk.
 *
 * SEMANTIKK: Quick er fakta. Pull OVERSKRIVER våre lokale felt for radene Quick
 * returnerer (se syncQuickCustomers — onConflictDoUpdate setter name/email/phone).
 * Lokale-KUN-felt (userId/Min-side-kobling, kundenotater) røres ALDRI.
 *
 * DELTA vs FULL: uten `full` sendes `changedAfterDate = lastSyncedAt`, så vi kun
 * henter det som er endret siden sist (vi hamrer ALDRI Quick). Første pull (ingen
 * lastSyncedAt) er naturlig full. `full: true` tvinger full re-synk (ignorerer
 * markøren) — til førstegangs- eller forsonings-synk.
 */
export interface QuickPullResult {
  ran: boolean;
  upserted?: number;
  batches?: number;
  /** Antall felt-konflikter oppdaget i denne pullen (lagt i konflikt-køen). */
  conflicts?: number;
  /** Grunn til at pull ikke kjørte (f.eks. «ikke konfigurert»). */
  reason?: string;
}

export async function runQuickCustomerPull(
  db: Database,
  tenantId: string,
  opts: { full?: boolean } = {},
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

  async function* upserts(): AsyncGenerator<QuickCustomerUpsert> {
    for await (const raw of client.iterateCustomers({ changedAfterDate })) {
      yield mapQuickCustomer(raw);
    }
  }

  try {
    const { upserted, batches, conflicts } = await syncQuickCustomers(db, tenantId, upserts());
    const conflictNote = conflicts > 0 ? ` · ${conflicts} konflikt(er)` : '';
    await svc.recordSync(tenantId, {
      status: 'ok',
      detail: `${upserted} kunde(r) hentet i ${batches} batch(er)${conflictNote}`,
      syncedAt: startedAt,
    });
    return { ran: true, upserted, batches, conflicts };
  } catch (error) {
    const detail = (error as Error).message;
    await svc.recordSync(tenantId, { status: 'error', detail });
    throw error;
  }
}
