import { describe, expect, it } from 'vitest';
import { createConcurrencyGate, TENANT_TX_CONCURRENCY } from '../src/concurrency.ts';

describe('createConcurrencyGate', () => {
  it('slipper aldri mer enn max samtidige gjennom run()', async () => {
    const gate = createConcurrencyGate(2);
    let active = 0;
    let peak = 0;

    async function jobb() {
      return gate.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 25));
        active -= 1;
      });
    }

    await Promise.all([jobb(), jobb(), jobb(), jobb(), jobb()]);
    expect(peak).toBe(2);
    expect(peak).toBeLessThanOrEqual(TENANT_TX_CONCURRENCY);
  });

  it('TENANT_TX_CONCURRENCY er 2 — ikke gjett-opp av pool-max', () => {
    expect(TENANT_TX_CONCURRENCY).toBe(2);
    expect(TENANT_TX_CONCURRENCY).toBeLessThan(5);
  });
});
