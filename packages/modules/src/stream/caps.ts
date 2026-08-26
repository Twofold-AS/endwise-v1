/**
 * Tilkoblings-caps.
 * SSE holder forbindelsen åpen. Det er hele poenget — og hele risikoen:
 * på Vercel er samtidige tilkoblinger den fremste kostnadsdriveren
 * (techstack §7), og en klient med en reconnect-løkke som har gått i ball kan
 * åpne hundrevis uten å mene noe vondt med det.
 * To grenser, fordi de fanger to ulike feil:
 * per bruker: en klient som løper løpsk
 * per tenant: en forhandler som (utilsiktet eller ikke) tar hele budsjettet
 */
export const MAX_CONNECTIONS_PER_USER = 5;
export const MAX_CONNECTIONS_PER_TENANT = 100;

export class ConnectionCapError extends Error {
  readonly code = 'CONNECTION_CAP';
  constructor(scope: 'user' | 'tenant') {
    super(
      scope === 'user'
        ? `Maks ${MAX_CONNECTIONS_PER_USER} samtidige tilkoblinger per bruker`
        : `Maks ${MAX_CONNECTIONS_PER_TENANT} samtidige tilkoblinger per forhandler`,
    );
  }
}

export function createConnectionRegistry() {
  const perUser = new Map<string, number>();
  const perTenant = new Map<string, number>();

  return {
    /** Kaster hvis en av grensene er nådd. Returnerer en release-funksjon. */
    acquire(tenantId: string, userId: string): () => void {
      const userKey = `${tenantId}:${userId}`;
      const userCount = perUser.get(userKey) ?? 0;
      const tenantCount = perTenant.get(tenantId) ?? 0;

      if (userCount >= MAX_CONNECTIONS_PER_USER) throw new ConnectionCapError('user');
      if (tenantCount >= MAX_CONNECTIONS_PER_TENANT) throw new ConnectionCapError('tenant');

      perUser.set(userKey, userCount + 1);
      perTenant.set(tenantId, tenantCount + 1);

      let released = false;
      return () => {
        // Idempotent: onAbort og en normal close kan begge fyre.
        if (released) return;
        released = true;
        const u = (perUser.get(userKey) ?? 1) - 1;
        const t = (perTenant.get(tenantId) ?? 1) - 1;
        if (u <= 0) perUser.delete(userKey);
        else perUser.set(userKey, u);
        if (t <= 0) perTenant.delete(tenantId);
        else perTenant.set(tenantId, t);
      };
    },

    count(tenantId: string, userId?: string): number {
      return userId ? (perUser.get(`${tenantId}:${userId}`) ?? 0) : (perTenant.get(tenantId) ?? 0);
    },
  };
}
