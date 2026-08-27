import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuickError } from '@endwise/toolkit-quick';
import { describe, expect, it } from 'vitest';
import { runIndependentOfCatalog } from '../src/lib/quick-pull.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('katalog-feil ruller ikke tilbake Client-apply', () => {
  it('apply er ferdig før catalog kaster', async () => {
    const writes: string[] = [];
    await expect(
      runIndependentOfCatalog({
        applyClient: async () => {
          writes.push('dealer');
          return { mappedKeys: ['name'] };
        },
        pullCatalog: async () => {
          throw new QuickError('Quick svarte 500', 500);
        },
      }),
    ).rejects.toMatchObject({ status: 500 });
    expect(writes).toEqual(['dealer']);
  });
});

describe('pullNow/setConfig kaller Client-apply uten nye Quick-stier', () => {
  it('pull anvender client/info før kunder/lager, uten felles rollback', () => {
    const pull = les('../src/lib/quick-pull.ts');
    expect(pull).toMatch(/runIndependentOfCatalog/);
    expect(pull).toMatch(/clientInfo/);
    expect(pull).toMatch(/applyQuickDealerProfile/);
    expect(pull).toMatch(/mapQuickClientInfo/);
    const applyIdx = pull.indexOf('applyQuickDealerProfile');
    const customersIdx = pull.indexOf('iterateCustomers');
    expect(applyIdx).toBeGreaterThan(-1);
    expect(customersIdx).toBeGreaterThan(applyIdx);
    expect(pull).not.toMatch(/\/resource\b/i);
    expect(pull).not.toMatch(/sellPriceMinor/);
  });

  it('setConfig/testConnection anvender Client etter vellykket probe', () => {
    const quick = les('../src/trpc/routers/quick.ts');
    expect(quick).toMatch(/applyQuickDealerProfile/);
    expect(quick).toMatch(/mapQuickClientInfo/);
    expect(quick).toMatch(/probeQuickReadOnly/);
    expect(quick).not.toMatch(/sellPriceMinor/);
  });
});
