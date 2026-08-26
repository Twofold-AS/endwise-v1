import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Engangskode når lederen slår av 2FA for en ansatt.
 * Koden sendes til lederens e-post (den som handler), aldri til målet.
 * Databasen lagrer SHA-256 — samme grep som invitasjonstoken (F1-10).
 */
export const TEAM_BEKREFTELSE_TTL_MS = 5 * 60_000;

export function teamBekreftelseId(tenantId: string, actorId: string, targetId: string): string {
  return `team-2fa:${tenantId}:${actorId}:${targetId}`;
}

export function hashTeamBekreftelse(kode: string): string {
  return createHash('sha256').update(kode, 'utf8').digest('hex');
}

export function kodeMatcher(lagretHash: string, oppgitt: string): boolean {
  const a = Buffer.from(lagretHash, 'hex');
  const b = Buffer.from(hashTeamBekreftelse(oppgitt), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function nyBekreftelseskode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}
