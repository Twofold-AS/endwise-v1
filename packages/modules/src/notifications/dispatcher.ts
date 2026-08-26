import { type Database, eq, schema, withTenant } from '@endwise/db';
import type { NotificationChannel, NotificationKind } from '../contracts/index.ts';

export interface DispatchInput {
  tenantId: string;
  kind: NotificationKind;
  /** Hva varselet gjelder: 'booking.confirmed', 'booking.reminder', 'deviation.alert' … */
  event: string;
  to: string;
  subject?: string;
  body: string;
  /** Utledes normalt av (event + booking-ID). Samme hendelse = samme nøkkel. */
  idempotencyKey: string;
}

export interface DispatchResult {
  sent: boolean;
  /** true = varselet var allerede sendt; vi gjorde ingenting. */
  duplicate: boolean;
  providerMessageId?: string;
}

export class NoChannelError extends Error {
  readonly code = 'NO_CHANNEL';
  constructor(kind: NotificationKind) {
    super(`Ingen kanal registrert for ${kind}`);
  }
}

/**
 * Varslingsmodulen.
 * Roadmap-teksten sier «Twilio + BullMQ». **BullMQ er et dødt valg**
 * (techstack §1/§6) — køen er Vercel Workflows (F0-13, ADR-003). Selve
 * sendingen* er det samme; det er transporten rundt som er en annen.
 * Idempotens-vakten er hele poenget: Workflows retryer steg som feiler. Går en
 * SMS ut og svaret forsvinner i en timeout, vil retry-en prøve igjen. Uten
 * vakten får kunden to påminnelser om samme time.
 * Derfor: **skriv raden først, send etterpå.** Er nøkkelen allerede brukt, gjør
 * vi ingenting. En unique-violation på (tenant, idempotency_key) betyr «noen
 * andre kom først» — ikke en feil.
 */
export function createDispatcher(db: Database, channels: readonly NotificationChannel[]) {
  const byKind = new Map(channels.map((channel) => [channel.kind, channel]));

  return {
    async dispatch(input: DispatchInput): Promise<DispatchResult> {
      const channel = byKind.get(input.kind);
      if (!channel) throw new NoChannelError(input.kind);

      // 1. Reserver nøkkelen. Vinner ingen rad, er varselet allerede sendt.
      const reserved = await withTenant(db, input.tenantId, (tx) =>
        tx
          .insert(schema.notifications)
          .values({
            tenantId: input.tenantId,
            channel: input.kind,
            recipient: input.to,
            kind: input.event,
            idempotencyKey: input.idempotencyKey,
            status: 'sent',
          })
          .onConflictDoNothing({
            target: [schema.notifications.tenantId, schema.notifications.idempotencyKey],
          })
          .returning(),
      );

      const row = reserved[0];
      if (!row) return { sent: false, duplicate: true };

      // 2. Send. Feiler den, markeres raden som failed — nøkkelen forblir brukt,
      // og en Workflow-retry vil se `failed` og kan velge å eskalere i stedet
      // for å spamme mottakeren.
      try {
        const result = await channel.send({
          tenantId: input.tenantId,
          to: input.to,
          subject: input.subject,
          body: input.body,
          idempotencyKey: input.idempotencyKey,
        });

        await withTenant(db, input.tenantId, (tx) =>
          tx
            .update(schema.notifications)
            .set({ providerMessageId: result.providerMessageId ?? null })
            .where(eq(schema.notifications.id, row.id)),
        );

        return { sent: true, duplicate: false, providerMessageId: result.providerMessageId };
      } catch (error) {
        await withTenant(db, input.tenantId, (tx) =>
          tx
            .update(schema.notifications)
            .set({ status: 'failed', error: (error as Error).message })
            .where(eq(schema.notifications.id, row.id)),
        );
        throw error;
      }
    },
  };
}

export type Dispatcher = ReturnType<typeof createDispatcher>;
