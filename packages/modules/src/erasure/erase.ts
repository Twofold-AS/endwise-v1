import { type Database, eq, schema, sql, withTenant } from '@endwise/db';
import { VENDOR_ERASURE_FACTS, vendorsWeCannotPurge } from './vendors.ts';

export interface EraseCustomerInput {
  tenantId: string;
  customerId: string;
  /** Hvem ba om det: bruker-ID, eller 'dsr' når den registrerte selv ba. */
  requestedBy: string;
}

export interface ErasureReport {
  requestId: string;
  status: 'completed' | 'partial';
  /** Ledd vi slettet i, med antall. */
  purged: Record<string, number>;
  /** Ledd som ble redaktert (ikke slettet), med antall. */
  redacted: Record<string, number>;
  /** Ledd vi ikke kan slette i — med begrunnelse. Dette er ikke en unnskyldning; det er et faktum. */
  notPurgeable: Array<{ where: string; why: string; goneWithinDays: number | null }>;
}

/**
 * Sletting av en kunde (art. 17), gjennom alle ledd.
 * Rekkefølgen er ikke tilfeldig:
 * 1. **Registrer forespørselen først.** Krasjer vi midt i slettingen, skal det
 * finnes et spor av at den ble bedt om. En sletting ingen vet ble forsøkt,
 * er en sletting som aldri skjedde.
 * 2. Slett/anonymiser i domenetabellene.
 * 3. Redaktér audit-loggen (kan ikke slettes — se sql/functions.sql).
 * 4. Dokumentér leverandørleddet, inkludert det vi ikke får slettet.
 * 5. Lukk forespørselen med rapporten.
 * Status blir `partial`, ikke `completed`, når det finnes ledd vi ikke kan
 * slette i. Å rapportere «completed» når Mistral fortsatt har prompten i 30
 * dager, ville vært en løgn i et dokument vi selv har laget for å bevise at vi
 * er til å stole på.
 */
export async function eraseCustomer(
  db: Database,
  input: EraseCustomerInput,
): Promise<ErasureReport> {
  const { tenantId, customerId, requestedBy } = input;

  // 1. Spor først.
  const request = await withTenant(db, tenantId, async (tx) => {
    const [row] = await tx
      .insert(schema.erasureRequests)
      .values({
        tenantId,
        subjectType: 'customer',
        subjectId: customerId,
        requestedBy,
        status: 'in_progress',
      })
      .returning();
    if (!row) throw new Error('Kunne ikke registrere sletteforespørselen');
    return row;
  });

  const purged: Record<string, number> = {};
  const redacted: Record<string, number> = {};

  await withTenant(db, tenantId, async (tx) => {
    // 2a. Meldinger i tråder kunden er del av.
    const threads = await tx
      .select({ threadId: schema.threadParticipants.threadId })
      .from(schema.threadParticipants)
      .where(eq(schema.threadParticipants.participantId, customerId));

    for (const { threadId } of threads) {
      const del = await tx.execute(sql`delete from messages where thread_id = ${threadId}`);
      purged.messages = (purged.messages ?? 0) + (del.rowCount ?? 0);
      await tx.execute(sql`delete from thread_participants where thread_id = ${threadId}`);
      await tx.execute(sql`delete from threads where id = ${threadId}`);
      purged.threads = (purged.threads ?? 0) + 1;
    }

    // 2b. Notater om kunden.
    const notes = await tx.execute(
      sql`delete from customer_notes where customer_id = ${customerId}`,
    );
    purged.customer_notes = notes.rowCount ?? 0;

    // 2c. Kjøretøy: koblingen brytes, kjøretøyet består.
    // Et regnr uten eier er ikke lenger en personopplysning — og verkstedet
    // trenger historikken på kjøretøyet (neste eier skal vite hva som er gjort).
    const vehicles = await tx.execute(
      sql`update vehicles set customer_id = null where customer_id = ${customerId}`,
    );
    redacted.vehicles = vehicles.rowCount ?? 0;

    // 2d. Bookinger: anonymiseres, slettes ikke.
    // Bokføringsloven krever at transaksjonen består. Vi fjerner personen
    // fra den, ikke transaksjonen fra regnskapet.
    const bookings = await tx.execute(
      sql`update bookings set customer_id = null, notes = null where customer_id = ${customerId}`,
    );
    redacted.bookings = bookings.rowCount ?? 0;

    // 2e. Stream-events adressert til kunden.
    const events = await tx.execute(
      sql`delete from stream_events where audience_id = ${customerId}`,
    );
    purged.stream_events = events.rowCount ?? 0;

    // 2f. Kunden selv.
    const customer = await tx.execute(sql`delete from customers where id = ${customerId}`);
    purged.customers = customer.rowCount ?? 0;

    // 3. Audit-loggen: redakteres gjennom den kontrollerte funksjonen.
    // App-rollen har fortsatt ingen UPDATE på audit_log — den ber bare om det.
    const audit = await tx.execute(sql`select redact_audit_log(${customerId}) as redacted`);
    const auditRows = (audit.rows[0] as { redacted?: number } | undefined)?.redacted ?? 0;
    redacted.audit_log = Number(auditRows);
  });

  // 4. Leverandørleddet — ærlig.
  const notPurgeable = vendorsWeCannotPurge().map((vendor) => ({
    where: vendor.vendor,
    why: vendor.whatWeCanDo,
    goneWithinDays: vendor.maxDaysUntilGone,
  }));

  const status: ErasureReport['status'] = notPurgeable.length > 0 ? 'partial' : 'completed';

  const report: ErasureReport = {
    requestId: request.id,
    status,
    purged,
    redacted,
    notPurgeable,
  };

  // 5. Lukk forespørselen.
  await withTenant(db, tenantId, (tx) =>
    tx
      .update(schema.erasureRequests)
      .set({
        status,
        report: report as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(schema.erasureRequests.id, request.id)),
  );

  return report;
}

/** Til personvernerklæringen og til svaret den registrerte får. */
export function vendorErasureFacts() {
  return VENDOR_ERASURE_FACTS;
}
