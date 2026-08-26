import type {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@endwise/modules';
import { Resend } from 'resend';

/**
 * Domenet standard-avsenderen bruker når `RESEND_FROM` ikke er satt.
 * Bevisst duplisert fra `packages/auth/src/env.ts`
 * (`RESEND_STANDARD_DOMENE`). Å importere `@endwise/auth` hit ville dratt
 * Better-Auth og hele db-laget inn i en tynn transportpakke, for én streng.
 * Samme avveining som `next.config.ts` gjør mot `dev-origins.ts`.
 * Duplikatet er ikke overlatt til en kommentar: `apps/api/test/
 * utgaaende-epost.test.ts` feiler hvis de to konstantene glir fra hverandre.
 */
export const RESEND_STANDARD_DOMENE = 'endwise.no';

/** E-postkanalen. Resend (techstack §5). */
export function createResendChannel(config: {
  apiKey: string;
  from?: string;
}): NotificationChannel {
  const client = new Resend(config.apiKey);
  /**
   * `||`, ikke `??`. `??` faller bare tilbake på `null`/`undefined`, så
   * en tom `RESEND_FROM` ville sluppet gjennom som avsenderadresse. `notify.ts`
   * sender `process.env.RESEND_FROM` rett inn hit, og en env-variabel satt til
   * tom streng er en helt vanlig tilstand i et halvkonfigurert miljø. Rettet
   * ; samme feil sto i `packages/auth/src/env.ts`.
   * Domenet MÅ være verifisert i Resend, ellers svarer den
   * `403 validation_error` og hvert varsel denne kanalen sender feiler — stille,
   * i en Workflow-logg. Se `RESEND_VERIFISERTE_DOMENER` i `@endwise/auth` for
   * hvilke som er det, og hvorfor den lista er eksakt og ikke en subdomene-regel.
   */
  const from = config.from || `Endwise <no-reply@${RESEND_STANDARD_DOMENE}>`;

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
