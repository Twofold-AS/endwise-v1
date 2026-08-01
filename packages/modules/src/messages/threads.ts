import { and, type Database, desc, eq, schema, sql, withTenant } from '@endwise/db';
import { publishEvent } from '../stream/publisher.ts';

export class NotAParticipantError extends Error {
  readonly code = 'NOT_A_PARTICIPANT';
  constructor(participantId: string, threadId: string) {
    super(`${participantId} er ikke deltaker i tråd ${threadId}`);
  }
}

/**
 * F6-01 — Meldings-modulen.
 *
 * To lag med tilgangskontroll, og de fanger to ULIKE feil:
 *   - RLS:        «hvilken tenants tråder?» — hindrer at forhandler A ser B
 *   - deltakelse: «er DU med i denne tråden?» — hindrer at en ansatt hos A
 *                 leser en kundesamtale hos A som han ikke er del av
 *
 * Bare RLS ville gitt hver ansatt tilgang til hver kundes samtale i huset.
 * Det er ikke en tenant-lekkasje, men det er fortsatt en lekkasje.
 */
export function createMessagesModule(db: Database) {
  async function assertParticipant(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    threadId: string,
    participantId: string,
  ) {
    const [row] = await tx
      .select({ id: schema.threadParticipants.participantId })
      .from(schema.threadParticipants)
      .where(
        and(
          eq(schema.threadParticipants.threadId, threadId),
          eq(schema.threadParticipants.participantId, participantId),
        ),
      )
      .limit(1);
    if (!row) throw new NotAParticipantError(participantId, threadId);
  }

  return {
    async createThread(input: {
      tenantId: string;
      kind: 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';
      subject?: string;
      participantIds: string[];
    }) {
      return withTenant(db, input.tenantId, async (tx) => {
        const [thread] = await tx
          .insert(schema.threads)
          .values({
            tenantId: input.tenantId,
            kind: input.kind,
            subject: input.subject ?? null,
          })
          .returning();
        if (!thread) throw new Error('Tråden ble ikke opprettet');

        await tx.insert(schema.threadParticipants).values(
          input.participantIds.map((participantId) => ({
            tenantId: input.tenantId,
            threadId: thread.id,
            participantId,
          })),
        );

        return thread;
      });
    },

    /**
     * Skriv melding + push den ut. Rekkefølgen er viktig: eventet publiseres
     * ETTER at meldingen er skrevet, ellers ville en klient kunne rekke å be om
     * en melding som ikke finnes ennå.
     */
    async postMessage(input: {
      tenantId: string;
      threadId: string;
      authorId: string;
      body: string;
    }) {
      const message = await withTenant(db, input.tenantId, async (tx) => {
        await assertParticipant(tx, input.threadId, input.authorId);

        const [created] = await tx
          .insert(schema.messages)
          .values({
            tenantId: input.tenantId,
            threadId: input.threadId,
            authorId: input.authorId,
            body: input.body,
          })
          .returning();
        if (!created) throw new Error('Meldingen ble ikke skrevet');

        await tx
          .update(schema.threads)
          .set({ lastMessageAt: created.createdAt })
          .where(eq(schema.threads.id, input.threadId));

        return created;
      });

      // Ett event per mottaker, slik at `audienceId` kan filtrere i SSE-strømmen.
      const participants = await withTenant(db, input.tenantId, (tx) =>
        tx
          .select({ participantId: schema.threadParticipants.participantId })
          .from(schema.threadParticipants)
          .where(eq(schema.threadParticipants.threadId, input.threadId)),
      );

      for (const p of participants) {
        if (p.participantId === input.authorId) continue; // ikke varsle deg selv
        await publishEvent(db, {
          tenantId: input.tenantId,
          type: 'message.created',
          subjectId: input.threadId,
          audienceId: p.participantId,
          // Ingen meldingstekst i payloaden — klienten henter meldingen gjennom RLS.
          payload: { threadId: input.threadId, messageId: message.id, authorId: input.authorId },
        });
      }

      return message;
    },

    /** Meldingene i en tråd. Krever deltakelse. */
    async listMessages(tenantId: string, threadId: string, readerId: string) {
      return withTenant(db, tenantId, async (tx) => {
        await assertParticipant(tx, threadId, readerId);
        return tx
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.threadId, threadId))
          .orderBy(schema.messages.createdAt);
      });
    },

    /** Innboksen: mine tråder + uleste-telling. */
    async listThreads(tenantId: string, participantId: string) {
      return withTenant(db, tenantId, (tx) =>
        tx
          .select({
            id: schema.threads.id,
            kind: schema.threads.kind,
            subject: schema.threads.subject,
            lastMessageAt: schema.threads.lastMessageAt,
            unread: sql<number>`(
              select count(*)::int from messages m
              where m.thread_id = ${schema.threads.id}
                and m.author_id <> ${participantId}
                and (${schema.threadParticipants.lastReadAt} is null
                     or m.created_at > ${schema.threadParticipants.lastReadAt})
            )`,
          })
          .from(schema.threads)
          .innerJoin(
            schema.threadParticipants,
            and(
              eq(schema.threadParticipants.threadId, schema.threads.id),
              eq(schema.threadParticipants.participantId, participantId),
            ),
          )
          .orderBy(desc(schema.threads.lastMessageAt)),
      );
    },

    /**
     * F6-05 — Legg mennesker inn i en tråd agenten allerede står i.
     * Idempotent: eskalerer agenten to ganger, dupliseres ikke deltakerne.
     */
    async addParticipants(tenantId: string, threadId: string, participantIds: string[]) {
      if (participantIds.length === 0) return;
      return withTenant(db, tenantId, (tx) =>
        tx
          .insert(schema.threadParticipants)
          .values(
            participantIds.map((participantId) => ({
              tenantId,
              threadId,
              participantId,
            })),
          )
          .onConflictDoNothing({
            target: [schema.threadParticipants.threadId, schema.threadParticipants.participantId],
          }),
      );
    },

    /**
     * F6-05 — Systemmelding fra agenten. Går utenom deltaker-sjekken fordi
     * agenten skriver PÅ VEGNE AV systemet i det øyeblikket den gir fra seg
     * tråden — men den er fortsatt tenant-skopet og RLS gjelder.
     */
    async postSystemMessage(input: {
      tenantId: string;
      threadId: string;
      authorId: string;
      body: string;
    }) {
      return withTenant(db, input.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.messages)
          .values({
            tenantId: input.tenantId,
            threadId: input.threadId,
            authorId: input.authorId,
            body: input.body,
          })
          .returning();

        await tx
          .update(schema.threads)
          .set({ lastMessageAt: new Date() })
          .where(eq(schema.threads.id, input.threadId));

        return created;
      });
    },

    async markRead(tenantId: string, threadId: string, participantId: string) {
      return withTenant(db, tenantId, async (tx) => {
        await assertParticipant(tx, threadId, participantId);
        await tx
          .update(schema.threadParticipants)
          .set({ lastReadAt: new Date() })
          .where(
            and(
              eq(schema.threadParticipants.threadId, threadId),
              eq(schema.threadParticipants.participantId, participantId),
            ),
          );
      });
    },
  };
}

export type MessagesModule = ReturnType<typeof createMessagesModule>;
