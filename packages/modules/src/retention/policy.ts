/**
 * Logg-policyen. **Kode, ikke et dokument.**
 * Art. 5(1)(e): personopplysninger skal ikke lagres lenger enn nødvendig.
 * «Nødvendig» er et tall, ikke en holdning — så her står tallene.
 * Regelen som gjelder når du legger til en ny tabell: hvis den kan inneholde
 * personopplysninger, skal den ha en rad her. Har den ikke det, blir den
 * liggende for alltid, og ingen oppdager det før Datatilsynet spør.
 */
export type RetentionBasis =
  | 'operational' // trengs for å levere tjenesten
  | 'accounting' // bokføringsloven (5 år)
  | 'security' // sikkerhet/sporbarhet
  | 'buffer'; // teknisk mellomlager

export interface RetentionRule {
  table: string;
  /** Kolonnen som avgjør alderen. */
  timestampColumn: string;
  days: number;
  basis: RetentionBasis;
  /** Hvorfor akkurat dette tallet. En retensjonstid uten begrunnelse er en gjetning. */
  rationale: string;
  /** Hvem kan lese tabellen i produksjon? */
  access: string;
  /**
   * Slettes radene, eller redakteres feltene?
   * `redact` brukes der raden må overleve av hensyn til integritet (audit-loggen).
   */
  mode: 'delete' | 'redact';
}

export const RETENTION_POLICY: readonly RetentionRule[] = [
  {
    table: 'stream_events',
    timestampColumn: 'created_at',
    days: 7,
    basis: 'buffer',
    rationale:
      'Kun en avspillingsbuffer for SSE-reconnect (F6-02). Sannheten ligger i domenetabellene. ' +
      'En uke dekker enhver rimelig frakobling; alt utover er hamstring.',
    access: 'App-rollen (RLS-skopet). Ingen manuell tilgang i produksjon.',
    mode: 'delete',
  },
  {
    table: 'notifications',
    timestampColumn: 'sent_at',
    days: 90,
    basis: 'operational',
    rationale:
      'Idempotens-vakten (F3-04) må huske hva som er sendt. 90 dager dekker påminnelser og ' +
      'reklamasjoner på utsendelser. Innholdet lagres ikke — kun mottaker, type og status.',
    access: 'App-rollen. Forhandler ser sine egne via RLS.',
    mode: 'delete',
  },
  {
    table: 'audit_log',
    timestampColumn: 'occurred_at',
    days: 365,
    basis: 'security',
    rationale:
      'Sporbarhet ved sikkerhetshendelser. Ett år er nok til å etterforske det man oppdager sent. ' +
      'MERK: rader SLETTES ikke — feltene REDAKTERES (se F14-16). Kjeden av hendelser overlever; ' +
      'personen forsvinner ut av den.',
    access: 'Kun dealer_admin/endwise_admin (F1-05). Append-only i databasen.',
    mode: 'redact',
  },
  {
    table: 'messages',
    timestampColumn: 'created_at',
    days: 730,
    basis: 'operational',
    rationale:
      'Kundedialog om et kjøretøy har verdi ved neste service. To år samsvarer med ' +
      'et normalt serviceintervall. Slettes tidligere ved sletteforespørsel (art. 17).',
    access: 'Kun trådens deltakere (F6-01). RLS + deltakelse.',
    mode: 'delete',
  },
  {
    table: 'erasure_requests',
    timestampColumn: 'requested_at',
    days: 0, // 0 = slettes aldri
    basis: 'security',
    rationale:
      'Beviset på at vi slettet må overleve slettingen. Uten den kan vi ikke dokumentere ' +
      'etterlevelse (art. 5(2)). Inneholder ingen personopplysninger utover subjekt-ID.',
    access: 'Kun endwise_admin.',
    mode: 'delete',
  },
];

export function ruleFor(table: string): RetentionRule | undefined {
  return RETENTION_POLICY.find((rule) => rule.table === table);
}

/** Tabeller som faktisk skal ryddes av cron. `days: 0` = aldri. */
export function prunableRules(): RetentionRule[] {
  return RETENTION_POLICY.filter((rule) => rule.days > 0);
}
