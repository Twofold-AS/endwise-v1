import { FatalError, RetryableError } from 'workflow';

/**
 * F0-13 — Vercel Workflows (durable functions) + Vercel Cron.
 * ADR-003 avgjort: ingen BullMQ, ingen QStash, ingen Trigger.dev, ingen Redis.
 *
 * Mønsteret som gjelder for ALLE jobber:
 *   "use workflow" = orkestrering (durable, resumable)
 *   "use step"     = én retry-bar enhet med full Node-tilgang
 *   RetryableError = forbigående feil  -> retry
 *   FatalError     = permanent feil    -> til DLQ-steget, ingen retry
 */

async function purgeExpiredRows(olderThanDays: number): Promise<number> {
  'use step';
  if (olderThanDays < 1) {
    throw new FatalError('olderThanDays må være >= 1');
  }
  try {
    // TODO(F1+): faktisk sletting via @endwise/db når tabellene finnes.
    return 0;
  } catch (error) {
    throw new RetryableError(`Opprydding feilet: ${String(error)}`, { retryAfter: '5m' });
  }
}

async function deadLetter(job: string, reason: string): Promise<void> {
  'use step';
  // DLQ-mønsteret: permanent feil parkeres og varsles, den kastes ikke bort.
  console.error(`[dlq] ${job}: ${reason}`);
}

export async function nightlyCleanupWorkflow(input: { olderThanDays: number }) {
  'use workflow';
  try {
    const purged = await purgeExpiredRows(input.olderThanDays);
    return { ok: true, purged };
  } catch (error) {
    if (error instanceof FatalError) {
      await deadLetter('nightly-cleanup', error.message);
      return { ok: false, purged: 0 };
    }
    throw error;
  }
}
