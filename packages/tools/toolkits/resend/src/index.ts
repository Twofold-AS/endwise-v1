import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import { Resend } from 'resend';

/**
 * Samme produkt-From som `@endwise/auth` (`RESEND_FROM_KANONISK`).
 * Toolkit importerer ikke auth — det ville dratt Better-Auth inn her.
 * `apps/api/test/utgaaende-epost.test.ts` feiler hvis strengene glir.
 */
export const RESEND_STANDARD_DOMENE = 'endwise.no';
export const RESEND_FROM_KANONISK = `Endwise <noreply@${RESEND_STANDARD_DOMENE}>`;

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function erEnkelEpost(adresse: string): boolean {
  const trimmet = adresse.trim();
  if (!EPOST.test(trimmet)) return false;
  if (/[\r\n,;]/.test(trimmet)) return false;
  return true;
}

function stripCrLf(verdi: string): string {
  return verdi.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}

/**
 * E-postkanal for F3-04-varsler. Ingen annen Resend-klient som hopper over
 * From/to-porten. `from` settes aldri av kalleren. `to` må godkjennes av
 * `kanSendeTil` (typisk `erProduktDestinasjon`).
 */
export function createResendChannel(config: {
  apiKey: string;
  kanSendeTil: (to: string) => Promise<boolean>;
}): NotificationChannel {
  if (Object.hasOwn(config, 'from')) {
    throw new Error('from settes ikke av kalleren');
  }
  if (typeof config.kanSendeTil !== 'function') {
    throw new Error('kanSendeTil er påkrevd — Resend fyrer ikke mot frie adresser');
  }
  const client = new Resend(config.apiKey);
  const from = RESEND_FROM_KANONISK;

  return {
    kind: 'email',
    name: 'resend',

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (from !== RESEND_FROM_KANONISK) {
        throw new Error(`From er ikke den kanoniske produktadressen (${RESEND_FROM_KANONISK})`);
      }
      const to = message.to.trim();
      if (!erEnkelEpost(to)) {
        throw new Error('Ugyldig to');
      }
      if (!(await config.kanSendeTil(to))) {
        throw new Error('Mottakeren er ikke en produkt-destinasjon');
      }
      const { data, error } = await client.emails.send({
        from,
        to,
        subject: stripCrLf(message.subject ?? 'Melding fra Endwise'),
        text: message.body,
        headers: { 'Idempotency-Key': message.idempotencyKey },
      });

      if (error) throw new Error(`Resend feilet: ${error.message}`);
      return { delivered: true, providerMessageId: data?.id };
    },
  };
}
