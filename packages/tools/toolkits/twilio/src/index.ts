import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import twilio from 'twilio';

/**
 * SMS-kanalen. Twilio (techstack §5).
 * Merk: dette er *transaksjonell SMS*, ikke Verify. Verify (OTP, F1-01) er en
 * annen tjeneste med en annen livssyklus — de skal ikke blandes.
 */
export function createTwilioChannel(config: {
  accountSid: string;
  authToken: string;
  from: string;
}): NotificationChannel {
  const client = twilio(config.accountSid, config.authToken);

  return {
    kind: 'sms',
    name: 'twilio',

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const result = await client.messages.create({
        to: message.to,
        from: config.from,
        body: message.body,
      });

      return { delivered: true, providerMessageId: result.sid };
    },
  };
}
