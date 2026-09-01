import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import twilio from 'twilio';

/**
 * SMS-kanalen. Twilio (techstack §5).
 * Transaksjonell SMS, ikke Verify. Verify (OTP, F1-01) bor i auth-senderen
 * og fyrer bare mot nummeret som verifiseres.
 * Dest er et predikat per kanal — default nei. Kalleren må sende tenant-id
 * (typisk `erTenantTelefonDestinasjon`). Ingen klient-To.
 */

export type KanSendeTil = (to: string, tenantId: string) => Promise<boolean>;

async function stengtDest(_to: string, _tenantId: string): Promise<boolean> {
  return false;
}

function erEnkelTelefon(n: string): boolean {
  const t = n.trim();
  if (!t) return false;
  if (/[\r\n,;]/.test(t)) return false;
  if (!/\d/.test(t)) return false;
  return t.length <= 20;
}

export function createTwilioChannel(config: {
  accountSid: string;
  authToken: string;
  from: string;
  kanSendeTil?: KanSendeTil;
}): NotificationChannel {
  if (Object.hasOwn(config, 'to')) {
    throw new Error('to settes ikke av kalleren');
  }
  const kanSendeTil: KanSendeTil =
    typeof config.kanSendeTil === 'function' ? config.kanSendeTil : stengtDest;
  const client = twilio(config.accountSid, config.authToken);

  return {
    kind: 'sms',
    name: 'twilio',

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const tenantId = message.tenantId?.trim() ?? '';
      if (!tenantId) {
        throw new Error('tenantId er påkrevd — dest er tenant-skopet');
      }
      const to = message.to.trim();
      if (!erEnkelTelefon(to)) {
        throw new Error('Ugyldig to');
      }
      if (!(await kanSendeTil(to, tenantId))) {
        throw new Error('Mottakeren er ikke en produkt-destinasjon');
      }
      const result = await client.messages.create({
        to,
        from: config.from,
        body: message.body,
      });

      return { delivered: true, providerMessageId: result.sid };
    },
  };
}
