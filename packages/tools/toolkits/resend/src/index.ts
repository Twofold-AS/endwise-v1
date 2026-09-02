import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import { Resend } from 'resend';
import { byggVarselHtml } from './epost-html.ts';

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

/** Uten predikat: nei. Alltid-sann er ikke default. */
async function stengtDest(_to: string, _tenantId: string): Promise<boolean> {
  return false;
}

export type KanSendeTil = (to: string, tenantId: string) => Promise<boolean>;

/**
 * E-postkanal for F3-04-varsler. From er hardkodet.
 * Dest er et eget predikat per kanal — ikke auth-OR-en.
 * `kanSendeTil` default er false (fail closed). Kalleren må sende
 * tenant-id inn i predikatet (typisk `erTenantDestinasjon`).
 */
export function createResendChannel(config: {
  apiKey: string;
  kanSendeTil?: KanSendeTil;
}): NotificationChannel {
  if (Object.hasOwn(config, 'from')) {
    throw new Error('from settes ikke av kalleren');
  }
  const kanSendeTil: KanSendeTil =
    typeof config.kanSendeTil === 'function' ? config.kanSendeTil : stengtDest;
  const client = new Resend(config.apiKey);
  const from = RESEND_FROM_KANONISK;

  return {
    kind: 'email',
    name: 'resend',

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (from !== RESEND_FROM_KANONISK) {
        throw new Error(`From er ikke den kanoniske produktadressen (${RESEND_FROM_KANONISK})`);
      }
      const tenantId = message.tenantId?.trim() ?? '';
      if (!tenantId) {
        throw new Error('tenantId er påkrevd — dest er tenant-skopet');
      }
      const to = message.to.trim();
      if (!erEnkelEpost(to)) {
        throw new Error('Ugyldig to');
      }
      if (!(await kanSendeTil(to, tenantId))) {
        throw new Error('Mottakeren er ikke en produkt-destinasjon');
      }
      const subject = stripCrLf(message.subject ?? 'Melding fra Endwise');
      const { data, error } = await client.emails.send({
        from,
        to,
        subject,
        text: message.body,
        html: byggVarselHtml({ tittel: subject, tekst: message.body }),
        headers: { 'Idempotency-Key': message.idempotencyKey },
      });

      if (error) throw new Error(`Resend feilet: ${error.message}`);
      return { delivered: true, providerMessageId: data?.id };
    },
  };
}
