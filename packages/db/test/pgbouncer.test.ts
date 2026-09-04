import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { appDatabaseUrl, ownerDatabaseUrl } from '../src/client.ts';

/**
 * F13-01 — vår PgBouncer foran app-trafikken (ikke Neon, ikke Scaleway
 * Serverless SQL). Kildekontrakt + env-splitt. Ingen DB, ingen hemmeligheter.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const client = les('../src/client.ts');
const migrate = les('../scripts/migrate.ts');
const grants = les('../scripts/grants.ts');
const repair = les('../scripts/repair-0020.ts');
const drizzleCfg = les('../drizzle.config.ts');
const envExample = les('../../../.env.example');
const dockerfile = les('../../../infra/pgbouncer/Dockerfile');
const iniTpl = les('../../../infra/pgbouncer/pgbouncer.ini.tpl');
const entry = les('../../../infra/pgbouncer/entrypoint.sh');
const note = les('../../../docs/pgbouncer.md');
const streamDev = les('../../../apps/stream/src/dev.ts');
const streamApp = les('../../../apps/stream/src/app.ts');
const authEnv = les('../../../packages/auth/src/env.ts');
const retention = les('../../../apps/api/src/routes/cron/retention.ts');
const context = les('../../../apps/api/src/context.ts');
const notify = les('../../../apps/api/src/workflows/notify.ts');
const cleanup = les('../../../apps/api/src/workflows/cleanup.ts');
const quickPull = les('../../../apps/api/src/routes/cron/quick-pull.ts');

const opprinnelig = {
  APP_DATABASE_URL: process.env.APP_DATABASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
};

afterEach(() => {
  if (opprinnelig.APP_DATABASE_URL === undefined) delete process.env.APP_DATABASE_URL;
  else process.env.APP_DATABASE_URL = opprinnelig.APP_DATABASE_URL;
  if (opprinnelig.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = opprinnelig.DATABASE_URL;
});

describe('appDatabaseUrl / ownerDatabaseUrl', () => {
  it('runtime foretrekker APP_DATABASE_URL, faller tilbake til DATABASE_URL', () => {
    process.env.APP_DATABASE_URL = 'postgresql://app@pooler:6432/endwise';
    process.env.DATABASE_URL = 'postgresql://eier@pg:5432/endwise';
    expect(appDatabaseUrl()).toBe('postgresql://app@pooler:6432/endwise');
    expect(ownerDatabaseUrl()).toBe('postgresql://eier@pg:5432/endwise');
  });

  it('mangler APP lokalt: fallback til DATABASE_URL (Docker har begge)', () => {
    delete process.env.APP_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://endwise:endwise@localhost:5432/endwise';
    expect(appDatabaseUrl()).toBe('postgresql://endwise:endwise@localhost:5432/endwise');
  });

  it('tom APP_DATABASE_URL teller som mangler', () => {
    process.env.APP_DATABASE_URL = '';
    process.env.DATABASE_URL = 'postgresql://endwise:endwise@localhost:5432/endwise';
    expect(appDatabaseUrl()).toBe('postgresql://endwise:endwise@localhost:5432/endwise');
  });

  it('kaster når begge mangler / når eier-URL mangler', () => {
    delete process.env.APP_DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(() => appDatabaseUrl()).toThrow(/APP_DATABASE_URL/);
    expect(() => ownerDatabaseUrl()).toThrow(/DATABASE_URL/);
  });
});

describe('createDb mot transaction-pooler', () => {
  it('slår av prepared statements (prepare: false) og beholder TCP-pool', () => {
    expect(client).toMatch(/prepare:\s*false/);
    expect(client).toMatch(/new Pool\(pgPoolConfig\(connectionString\)\)/);
    expect(client).not.toMatch(
      /neon\(|@neondatabase\/serverless|WebsocketDriver|ws\+postgres|postgres\(/,
    );
    expect(client).not.toMatch(/(?:db|tx|client|pool)\.prepare\(/);
  });

  it('withTenant bruker set_config(..., true) inne i db.transaction (SET LOCAL)', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, client.indexOf('export async function withPlatformAdmin'));
    expect(kropp).toMatch(/tenantTxGate\.run/);
    expect(kropp).toMatch(/db\.transaction/);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp.slice(0, 420)).not.toMatch(/set_config\('app\.platform_admin'/);
  });
});

describe('eier-URL direkte — aldri gjennom pooleren', () => {
  it('migrate, grants, repair-0020 og drizzle-kit bruker kun DATABASE_URL', () => {
    for (const kilde of [migrate, grants, repair, drizzleCfg]) {
      expect(kilde).toMatch(/DATABASE_URL/);
      expect(kilde).not.toMatch(/APP_DATABASE_URL/);
    }
  });
});

describe('runtime mot APP_DATABASE_URL', () => {
  it('authEnv.databaseUrl (magic-link/createAuth) går APP først', () => {
    const start = authEnv.indexOf('get databaseUrl');
    expect(start).toBeGreaterThan(-1);
    const kropp = authEnv.slice(start, start + 180);
    expect(kropp).toMatch(/APP_DATABASE_URL/);
    expect(kropp).toMatch(/DATABASE_URL/);
  });

  it('tRPC-context, notify, cleanup, retention og quick-pull er APP-først', () => {
    for (const kilde of [context, notify, cleanup, retention, quickPull]) {
      expect(kilde).toMatch(/APP_DATABASE_URL/);
    }
  });

  it('stream LISTEN bruker DATABASE_URL; app-db bruker APP (listenUrl)', () => {
    expect(streamApp).toMatch(/listenUrl \?\? options\.databaseUrl/);
    expect(streamApp).toMatch(/createStreamSubscriber\(options\.listenUrl/);
    expect(streamDev).toMatch(/listenUrl/);
    expect(streamDev).toMatch(/DATABASE_URL/);
    expect(streamDev).toMatch(/APP_DATABASE_URL/);
  });
});

describe('PgBouncer-container (infra/pgbouncer)', () => {
  it('transaction-pool, 6432, 1000 klienter, pool 20, SCRAM, TLS mot server', () => {
    expect(iniTpl).toMatch(/pool_mode\s*=\s*transaction/);
    expect(iniTpl).toMatch(/listen_port\s*=\s*6432/);
    expect(iniTpl).toMatch(/max_client_conn\s*=\s*1000/);
    expect(iniTpl).toMatch(/default_pool_size\s*=\s*20/);
    expect(iniTpl).toMatch(/auth_type\s*=\s*scram-sha-256/);
    expect(iniTpl).toMatch(/server_tls_sslmode\s*=\s*require/);
    expect(dockerfile).toMatch(/EXPOSE 6432/);
    expect(dockerfile).toMatch(/pgbouncer/i);
    expect(entry).toMatch(/exec pgbouncer/);
    expect(entry).toMatch(/PG_HOST/);
    expect(entry).toMatch(/PG_PASSWORD/);
  });

  it('ingen hemmeligheter eller oppdiktede hostnavn i git', () => {
    for (const kilde of [iniTpl, dockerfile, entry, note, envExample]) {
      expect(kilde).not.toMatch(/scw\.cloud|neon\.tech|password\s*=\s*['"][^'"_]/i);
    }
  });

  it('docs: Vercel APP_DATABASE_URL → pooler :6432; DATABASE_URL blir på :5432', () => {
    expect(note).toMatch(/APP_DATABASE_URL/);
    expect(note).toMatch(/6432/);
    expect(note).toMatch(/DATABASE_URL/);
    expect(note).toMatch(/5432/);
    expect(note).toMatch(/19800/);
    expect(note).toMatch(/Klient-TLS|klient-TLS|client.?tls/i);
    expect(note).toMatch(/max:\s*5/);
    expect(note).toMatch(/max:\s*1/);
    expect(note).toMatch(/TENANT_TX_CONCURRENCY/);
    expect(note).toMatch(/min_scale\s*=\s*1/);
    expect(note).toMatch(/ikke.*Serverless SQL|Serverless SQL.*ikke/i);
    expect(note).not.toMatch(/neon\.tech/i);
    expect(envExample).toMatch(/6432/);
    expect(envExample).toMatch(/5432/);
  });
});
