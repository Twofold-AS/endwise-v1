/** F0-06 — NotificationChannel. Resend (e-post) og Twilio (SMS) implementerer denne. */
export type NotificationKind = 'email' | 'sms';

export interface NotificationMessage {
  tenantId: string;
  to: string;
  subject?: string;
  body: string;
  /** Idempotensnøkkel — hindrer dobbeltsending ved retry i Workflows. */
  idempotencyKey: string;
}

export interface NotificationResult {
  delivered: boolean;
  providerMessageId?: string;
}

export interface NotificationChannel {
  readonly kind: NotificationKind;
  readonly name: string;
  send(message: NotificationMessage): Promise<NotificationResult>;
}
