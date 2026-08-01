import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import { Resend } from 'resend';

/** F3-04 — E-postkanalen. Resend (techstack §5). */
export function createResendChannel(config: {
  apiKey: string;
  from?: string;
}): NotificationChannel {
  const client = new Resend(config.apiKey);
  const from = config.from ?? 'Endwise <noreply@endwise.no>';

  return {
    kind: 'email',
    name: 'resend',

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const { data, error } = await client.emails.send({
        from,
        to: message.to,
        subject: message.subject ?? 'Melding fra Endwise',
        text: message.body,
        // Resend sin egen idempotens — vår DB-vakt (F3-04) er beltet, denne er selen.
        headers: { 'Idempotency-Key': message.idempotencyKey },
      });

      if (error) throw new Error(`Resend feilet: ${error.message}`);
      return { delivered: true, providerMessageId: data?.id };
    },
  };
}
