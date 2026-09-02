/**
 * Begrenset parallellitet for isolate-lokal DB-bruk.
 * Vercel-isolatet har `pgPoolConfig.max` 5 mot PgBouncer :6432.
 * Uten port: ett tRPC-batch fyrer ~13 `withTenant` (hver `db.transaction`)
 * samtidig, tømmer poolen, og `getSession` / `session.me` venter til
 * `connectionTimeoutMillis` — eller henger hvis noen holder en transaksjon
 * og ber om en til (nøstet `withTenant`).
 * 2 er bevisst: plass til sesjonsoppslag på de andre slottene. Ikke gjett
 * opp `max` på poolen.
 */
export const TENANT_TX_CONCURRENCY = 2;

export function createConcurrencyGate(max: number): {
  run<T>(fn: () => Promise<T>): Promise<T>;
} {
  if (max < 1) throw new Error('createConcurrencyGate: max må være minst 1');
  let active = 0;
  const kø: Array<() => void> = [];

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      if (active >= max) {
        await new Promise<void>((resolve) => {
          kø.push(resolve);
        });
      }
      active += 1;
      try {
        return await fn();
      } finally {
        active -= 1;
        kø.shift()?.();
      }
    },
  };
}

export const tenantTxGate = createConcurrencyGate(TENANT_TX_CONCURRENCY);
