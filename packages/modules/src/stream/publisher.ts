import { asc, type Database, gt, STREAM_CHANNEL, schema, sql, withTenant } from '@endwise/db';

export interface PublishInput {
  tenantId: string;
  type: string;
  payload: Record<string, unknown>;
  subjectId?: string | null;
  /** Bruker-ID varselet gjelder. Null = hele tenanten. */
  audienceId?: string | null;
}

/**
 * Publisering.
 * To trinn, i én transaksjon:
 * 1. Skriv eventet (får en monoton `id`)
 * 2. Notify med bare «id + tenant + audience»
 * Notify-payloaden inneholder aldri innhold. To grunner, og begge er reelle:
 * Postgres kutter notify-payload på 8000 bytes. En lang melding ville
 * stilltiende blitt avkortet.
 * Alle som lytter på kanalen ser payloaden. Å legge meldingstekst der ville
 * vært å sende hver kundes samtale til hver eneste tilkoblede prosess.
 * Innholdet hentes fra tabellen, gjennom RLS.
 * Notify er varselklokka. Tabellen er sannheten.
 */
export async function publishEvent(db: Database, input: PublishInput) {
  return withTenant(db, input.tenantId, async (tx) => {
    const [event] = await tx
      .insert(schema.streamEvents)
      .values({
        tenantId: input.tenantId,
        type: input.type,
        payload: input.payload,
        subjectId: input.subjectId ?? null,
        audienceId: input.audienceId ?? null,
      })
      .returning();
    if (!event) throw new Error('Event ble ikke skrevet');

    const signal = JSON.stringify({
      id: event.id,
      tenantId: input.tenantId,
      audienceId: input.audienceId ?? null,
    });

    await tx.execute(sql`select pg_notify(${STREAM_CHANNEL}, ${signal})`);
    return event;
  });
}

/**
 * Avspilling ved reconnect (Last-Event-ID).
 * Går gjennom `withTenant`, altså RLS. En klient som sender en `Last-Event-ID`
 * fra en annen tenant får null rader — ikke andres historikk.
 */
export async function readEventsSince(
  db: Database,
  tenantId: string,
  lastEventId: number,
  audienceId: string,
  limit = 200,
) {
  return withTenant(db, tenantId, (tx) =>
    tx
      .select()
      .from(schema.streamEvents)
      .where(
        sql`${gt(schema.streamEvents.id, lastEventId)}
            and (${schema.streamEvents.audienceId} is null
                 or ${schema.streamEvents.audienceId} = ${audienceId})`,
      )
      .orderBy(asc(schema.streamEvents.id))
      .limit(limit),
  );
}

/**
 * Høyeste event-id tenanten kan se. Klienten bruker den som start-cursor
 * slik at en poll-reserve ikke spiller av historikk og fyrer gamle lyder.
 */
export async function headEventId(db: Database, tenantId: string): Promise<number> {
  const [row] = await withTenant(db, tenantId, (tx) =>
    tx
      .select({
        id: sql<number>`coalesce(max(${schema.streamEvents.id}), 0)`,
      })
      .from(schema.streamEvents),
  );
  return Number(row?.id ?? 0);
}

/** Eventer eldre enn N dager ryddes av cron (F0-13). Loggen er en buffer, ikke et arkiv. */
export async function pruneEvents(db: Database, tenantId: string, olderThanDays = 7) {
  return withTenant(db, tenantId, (tx) =>
    tx
      .delete(schema.streamEvents)
      .where(sql`${schema.streamEvents.createdAt} < now() - ${olderThanDays} * interval '1 day'`),
  );
}
