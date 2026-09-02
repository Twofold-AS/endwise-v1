import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Begrenset parallellitet for isolate-lokal DB-bruk.
 * Vercel-isolatet har `pgPoolConfig.max` 5 mot PgBouncer :6432.
 * Uten port: ett tRPC-batch fyrer ~13 `withTenant` (hver `db.transaction`)
 * samtidig, tømmer poolen, og `getSession` / `session.me` venter til
 * `connectionTimeoutMillis` — eller henger hvis noen holder en transaksjon
 * og ber om en til (nøstet `withTenant`).
 * 2 er bevisst: plass til sesjonsoppslag på de andre slottene. Ikke gjett
 * opp `max` på poolen.
 *
 * Porten er **ikke** reentrant. Nøstet `run()` kaster — det er den gamle
 * deadlocken (ytterste tx holder slotten, inner venter evig). Kallstedet
 * skal slippe ytterste `withTenant` før det ber om en til.
 */
export const TENANT_TX_CONCURRENCY = 2;

/** Samme orden som `connectionTimeoutMillis`. Køen skal ikke vente evig. */
export const TENANT_TX_WAIT_TIMEOUT_MS = 5_000;

const inneIGate = new AsyncLocalStorage<true>();

export function createConcurrencyGate(
  max: number,
  waitTimeoutMs = TENANT_TX_WAIT_TIMEOUT_MS,
): {
  run<T>(fn: () => Promise<T>): Promise<T>;
} {
  if (max < 1) throw new Error('createConcurrencyGate: max må være minst 1');
  let active = 0;
  const kø: Array<() => void> = [];

  function ventPaPlass(): Promise<void> {
    return new Promise((resolve, reject) => {
      let ferdig = false;
      const timer = setTimeout(() => {
        if (ferdig) return;
        ferdig = true;
        const i = kø.indexOf(slipp);
        if (i >= 0) kø.splice(i, 1);
        reject(new Error('tenant-tx-kø ventet for lenge'));
      }, waitTimeoutMs);
      function slipp() {
        if (ferdig) return;
        ferdig = true;
        clearTimeout(timer);
        resolve();
      }
      kø.push(slipp);
    });
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      if (inneIGate.getStore()) {
        throw new Error(
          'withTenant/withPlatform* kan ikke nøstes. Slipp ytterste transaksjon først.',
        );
      }
      if (active >= max) {
        await ventPaPlass();
      }
      active += 1;
      try {
        return await inneIGate.run(true, fn);
      } finally {
        active -= 1;
        kø.shift()?.();
      }
    },
  };
}

export const tenantTxGate = createConcurrencyGate(TENANT_TX_CONCURRENCY);
