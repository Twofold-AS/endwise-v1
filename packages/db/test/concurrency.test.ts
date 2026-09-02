import { describe, expect, it } from 'vitest';
import {
  createConcurrencyGate,
  TENANT_TX_CONCURRENCY,
  TENANT_TX_WAIT_TIMEOUT_MS,
} from '../src/concurrency.ts';

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

  it('kaster på nøstet run — det er deadlocken mot pool max 5', async () => {
    const gate = createConcurrencyGate(2);
    await expect(
      gate.run(async () => {
        await gate.run(async () => 'indre');
      }),
    ).rejects.toThrow(/kan ikke nøstes/);
  });

  it('køen feiler bounded i stedet for å vente evig', async () => {
    const gate = createConcurrencyGate(1, 40);
    const start = Date.now();
    const holder = gate.run(() => new Promise<void>(() => undefined));
    await expect(gate.run(async () => 'nei')).rejects.toThrow(/ventet for lenge/);
    expect(Date.now() - start).toBeLessThan(500);
    void holder;
  });

  it('TENANT_TX_CONCURRENCY er 2 — ikke gjett-opp av pool-max', () => {
    expect(TENANT_TX_CONCURRENCY).toBe(2);
    expect(TENANT_TX_CONCURRENCY).toBeLessThan(5);
    expect(TENANT_TX_WAIT_TIMEOUT_MS).toBe(5_000);
  });
});
