import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createVegvesenConfigService,
  hentVegvesenApiNokkel,
  VEGVESEN_PROVIDER,
} from '../src/vegvesen/config.ts';

/**
 * F2-08 — Vegvesen-nøkkelen er server-only. `getView` har aldri selve
 * hemmeligheten, og klientkoden bundler den ikke.
 */

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Vegvesen-nøkkel: server-only', () => {
  it('getView-typen og kilden eksponerer aldri apiKey/token', () => {
    const kilde = les('../src/vegvesen/config.ts');
    expect(kilde).toMatch(/hasKey: boolean/);
    expect(kilde).toMatch(/Aldri eksponer/);
    expect(kilde).not.toMatch(/console\.(log|info|debug|warn).*apiKey/);
    expect(kilde).not.toMatch(/console\.(log|info|debug|warn).*tokenCipher/);
    expect(kilde).toMatch(/VEGVESEN_PROVIDER = 'vegvesen'/);
  });

  it('lookup leser nøkkelen via hentVegvesenApiNokkel — ikke process.env i klienten', () => {
    const lookup = les('../../../apps/api/src/trpc/routers/lookup.ts');
    expect(lookup).toMatch(/hentVegvesenApiNokkel/);
    expect(lookup).not.toMatch(/process\.env\.VEGVESEN_API_KEY/);

    const ruter = les('../../../apps/api/src/trpc/routers/vegvesen.ts');
    expect(ruter).toMatch(/hasKey/);
    expect(ruter).not.toMatch(/return \{[^}]*nokkel/);
    expect(ruter).not.toMatch(/return .*token/);
    expect(ruter).not.toMatch(/console\.(log|info|debug|warn)/);
  });

  it('klientflaten bundler ikke nøkkelen og leser den ikke fra env', () => {
    const side = les('../../../apps/web/app/(app)/integrasjoner/vegvesen/page.tsx');
    expect(side).toMatch(/hasKey/);
    expect(side).not.toMatch(/VEGVESEN_API_KEY/);
    expect(side).not.toMatch(/process\.env/);
    expect(side).toMatch(/type=['"]password['"]/);
    expect(side).not.toMatch(/Placeholder/);
  });
});

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('Vegvesen-nøkkel mot ekte database', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const kek = randomBytes(32).toString('base64');

  beforeAll(async () => {
    process.env.ENDWISE_KEK = kek;
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: tenantId,
      name: 'Vegvesen-test',
      slug: `vv-${tenantId.slice(0, 8)}`,
    });
  });

  afterAll(async () => {
    await owner
      .delete(schema.integrationConfig)
      .where(eq(schema.integrationConfig.tenantId, tenantId));
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  it('set lagrer kryptert; getView har hasKey og aldri nøkkelen', async () => {
    const svc = createVegvesenConfigService(app);
    const hemmelig = `svv-test-${randomUUID()}`;
    await svc.set(tenantId, hemmelig);

    const visning = await svc.getView(tenantId);
    expect(visning).toEqual({ hasKey: true });
    expect(JSON.stringify(visning)).not.toContain(hemmelig);

    const dekryptert = await svc.getDecrypted(tenantId);
    expect(dekryptert).toBe(hemmelig);

    const [rad] = await owner
      .select()
      .from(schema.integrationConfig)
      .where(
        and(
          eq(schema.integrationConfig.tenantId, tenantId),
          eq(schema.integrationConfig.provider, VEGVESEN_PROVIDER),
        ),
      );
    expect(rad?.tokenCipher).toBeTruthy();
    expect(rad?.tokenCipher).not.toContain(hemmelig);
  });

  it('hentVegvesenApiNokkel foretrekker tenant-nøkkelen foran env', async () => {
    process.env.VEGVESEN_API_KEY = 'env-skal-ikke-vinne';
    const fraTenant = await hentVegvesenApiNokkel(app, tenantId);
    expect(fraTenant).not.toBe('env-skal-ikke-vinne');
    expect(fraTenant?.startsWith('svv-test-')).toBe(true);
  });
});
