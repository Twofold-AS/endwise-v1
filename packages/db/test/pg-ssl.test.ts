import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';
import { drizzleKitPgCredentials, pgConnectionConfig } from '../src/client.ts';

/**
 * F13-01 — Vercel → Scaleway Managed PostgreSQL.
 *
 * Scaleway public TLS bruker egen CA. node-postgres behandler `sslmode=require`
 * som verify-full, så Node kaster DEPTH_ZERO_SELF_SIGNED_CERT.
 *
 * Rene enhetstester (ingen DB): beviser at fjern host får TLS uten CA-sjekk,
 * at localhost/docker ikke får workarounen, og at TLS ikke skrus av.
 */
function resolvedSsl(connectionString: string) {
  const client = new Client(pgConnectionConfig(connectionString));
  return client.connectionParameters.ssl;
}

describe('pgConnectionConfig (F13-01 Scaleway TLS)', () => {
  it('localhost uten sslmode: ingen SSL-override (Docker-Postgres)', () => {
    const config = pgConnectionConfig('postgresql://endwise:endwise@localhost:5432/endwise');
    expect(config).toEqual({
      connectionString: 'postgresql://endwise:endwise@localhost:5432/endwise',
    });
    expect(config).not.toHaveProperty('ssl');
    expect(resolvedSsl(config.connectionString)).toBeFalsy();
  });

  it('127.0.0.1 og ::1 behandles som localhost', () => {
    expect(
      pgConnectionConfig('postgresql://endwise:endwise@127.0.0.1:5432/endwise'),
    ).not.toHaveProperty('ssl');
    expect(
      pgConnectionConfig('postgresql://endwise:endwise@[::1]:5432/endwise'),
    ).not.toHaveProperty('ssl');
  });

  it('Scaleway-host med sslmode=require: TLS på, uten CA-verifisering', () => {
    const url =
      'postgresql://endwise_app:hemmelig@xxx.fr-par.pg.rdb.scw.cloud:5432/endwise?sslmode=require';
    const config = pgConnectionConfig(url);

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.ssl).not.toBe(false);
    expect(config.connectionString).not.toMatch(/sslmode=/i);

    const ssl = resolvedSsl(url);
    expect(ssl).toEqual({ rejectUnauthorized: false });
    expect(ssl).not.toBe(true);
    expect(ssl).not.toBe(false);
  });

  it('drizzle.config.ts bruker drizzleKitPgCredentials (host+ssl, ikke bare url)', () => {
    const kilde = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle.config.ts'),
      'utf8',
    );
    expect(kilde).toMatch(/drizzleKitPgCredentials/);
  });

  it('drizzle-kit-credentials mot Scaleway: TLS uten CA-sjekk (ikke url-only)', () => {
    const creds = drizzleKitPgCredentials(
      'postgresql://endwise:hemmelig@xxx.fr-par.pg.rdb.scw.cloud:5432/endwise?sslmode=require',
    );
    expect(creds).toMatchObject({
      host: 'xxx.fr-par.pg.rdb.scw.cloud',
      port: 5432,
      user: 'endwise',
      database: 'endwise',
      ssl: { rejectUnauthorized: false },
    });
    expect(creds).not.toHaveProperty('url');
  });

  it('drizzle-kit-credentials mot localhost: ingen SSL-override', () => {
    const creds = drizzleKitPgCredentials('postgresql://endwise:endwise@localhost:5432/endwise');
    expect(creds.host).toBe('localhost');
    expect(creds).not.toHaveProperty('ssl');
  });

  it('APP_DATABASE_URL mot fjern host uten sslmode får samme TLS-workaround', () => {
    const config = pgConnectionConfig(
      'postgresql://endwise_app:hemmelig@xxx.fr-par.pg.rdb.scw.cloud:5432/endwise',
    );
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(resolvedSsl(config.connectionString)).toEqual({
      rejectUnauthorized: false,
    });
  });
});
