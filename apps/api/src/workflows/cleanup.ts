import { countSessions, createDb, purgeExpiredSessions } from '@endwise/db';
import { FatalError, RetryableError } from 'workflow';

/**
 * Vercel Workflows (durable functions) + Vercel Cron.
 * ADR-003 avgjort: ingen BullMQ, ingen QStash, ingen Trigger.dev, ingen Redis.
 * Mønsteret som gjelder for alle jobber:
 * "use workflow" = orkestrering (durable, resumable)
 * "use step" = én retry-bar enhet med full Node-tilgang
 * RetryableError = forbigående feil -> retry
 * FatalError = permanent feil -> til dlq-steget, ingen retry
 */

/**
 * F1-11/F1-12 — sletter døde sesjonsrader.
 * Dette er hygiene, ikke en sikkerhetsmekanisme. En utløpt rad gir ingen
 * tilgang — `requireSession` avviser den lenge før den slettes her. Uten jobben
 * hoper de seg bare opp: dev-basen hadde 85 rader der samtlige var utløpt.
 * Sletter kun rader som allerede er døde (passert idle-vindu eller absolutt
 * maks-levetid). Den rører aldri en levende sesjon — en «opprydding» som
 * logger ut folk midt i arbeidsdagen er et driftsavbrudd, ikke vedlikehold.
 * `olderThanDays` gjelder ikke her, med vilje: en sesjon som utløp for ti
 * minutter siden er like død som en fra i fjor, og å beholde den i 30 dager
 * ville bare vært å ta vare på IP-adresser og user-agents lenger enn nødvendig
 * (F14-03, dataminimering). Parameteren styrer de andre oppryddingene.
 */
async function purgeExpiredRows(olderThanDays: number): Promise<number> {
  'use step';
  if (olderThanDays < 1) {
    throw new FatalError('olderThanDays må være >= 1');
  }
  try {
    const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new FatalError('APP_DATABASE_URL (eller DATABASE_URL) mangler');

    const db = createDb(url);
    const for_ = await countSessions(db);
    const slettet = await purgeExpiredSessions(db);
    console.info(
      `[cleanup] sesjoner: ${for_.totalt} totalt, ${for_.utlopte} utløpt → slettet ${slettet}`,
    );

    // TODO(F1+): øvrige tabeller kobles på her etter hvert som de får
    // retensjonsregler. Sesjonene er den første som faktisk hopet seg opp.
    return slettet;
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new RetryableError(`Opprydding feilet: ${String(error)}`, { retryAfter: '5m' });
  }
}

async function deadLetter(job: string, reason: string): Promise<void> {
  'use step';
  // Dlq-mønsteret: permanent feil parkeres og varsles, den kastes ikke bort.
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
