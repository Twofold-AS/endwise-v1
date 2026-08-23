/**
 * F3-12 — Hvem får redigere kompetanse?
 *
 * Regelen er ikke «alle innloggede i tenanten». En mekaniker som kan gi seg selv
 * ferdigheten `mc-eu` kan booke seg selv på jobber han ikke har lov til å ta —
 * og sertifiseringsdatoen er da bare et tall han skrev inn selv.
 *
 * Derfor: kun `dealer_admin` (i EGEN tenant) og `endwise_admin`.
 * `dealer_staff` og `customer` kan LESE (staff må se hvem som kan hva for å
 * booke manuelt), men aldri skrive.
 */
export type CompetenceRole =
  | 'customer'
  | 'dealer_staff'
  | 'dealer_admin'
  | 'endwise_admin'
  | 'endwise_support';

const CAN_WRITE: readonly CompetenceRole[] = ['dealer_admin', 'endwise_admin'];
const CAN_READ: readonly CompetenceRole[] = ['dealer_staff', 'dealer_admin', 'endwise_admin'];

export class CompetenceForbiddenError extends Error {
  readonly code = 'COMPETENCE_FORBIDDEN';
  constructor(role: string, action: 'read' | 'write') {
    super(`Rollen «${role}» kan ikke ${action === 'write' ? 'endre' : 'lese'} kompetanse`);
  }
}

export function canWriteCompetence(role: CompetenceRole): boolean {
  return CAN_WRITE.includes(role);
}

export function canReadCompetence(role: CompetenceRole): boolean {
  return CAN_READ.includes(role);
}

export function assertCanWriteCompetence(role: CompetenceRole): void {
  if (!canWriteCompetence(role)) throw new CompetenceForbiddenError(role, 'write');
}

export function assertCanReadCompetence(role: CompetenceRole): void {
  if (!canReadCompetence(role)) throw new CompetenceForbiddenError(role, 'read');
}
