import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * session.me holdt ytterste withTenant åpen og ba om flere (verksteder
 * via Promise.all). Mot pool max 5 + 13 parallelle prosedyrer = deadlock
 * / connection timeout, og hele first-paint-batchen ble aldri ferdig.
 */
describe('session.me holder ikke tenant-tx mens den ber om flere', () => {
  it('kjerne-withTenant avsluttes før verksted-oppslag', () => {
    const kilde = utenKommentarer(les('../src/trpc/routers/session.ts'));
    const me = kilde.slice(kilde.indexOf('me: protectedProcedure'));
    expect(me).toMatch(/const kjerne = await withTenant/);
    expect(me).not.toMatch(/Promise\.all\(\s*verkstederRaa\.map/);
    const kjerneStart = me.indexOf('const kjerne = await withTenant');
    const nesteWithTenant = me.indexOf(
      'withTenant',
      kjerneStart + 'const kjerne = await withTenant'.length,
    );
    expect(nesteWithTenant).toBeGreaterThan(kjerneStart);
    const mellom = me.slice(kjerneStart, nesteWithTenant);
    expect(mellom).toMatch(/\)\s*;/);
  });
});

describe('tRPC-batch og tenant-tx er begrenset', () => {
  it('createRequestContext setter limitBatch (2) på alle retur-stier', () => {
    const ctx = utenKommentarer(les('../src/context.ts'));
    expect(ctx).toMatch(/TRPC_BATCH_CONCURRENCY/);
    expect(ctx).toMatch(/limitBatch/);
    expect(ctx).toMatch(/createConcurrencyGate/);
  });

  it('protectedProcedure kjører gjennom ctx.limitBatch', () => {
    const init = utenKommentarer(les('../src/trpc/init.ts'));
    expect(init).toMatch(/limitBatch/);
  });

  it('withTenant/withPlatform* går gjennom tenantTxGate', () => {
    const client = utenKommentarer(les('../../../packages/db/src/client.ts'));
    expect(client).toMatch(/tenantTxGate\.run/);
    expect(client).toMatch(/prepare:\s*false/);
    expect(client).toMatch(/connectionTimeoutMillis:\s*5_000/);
  });
});
