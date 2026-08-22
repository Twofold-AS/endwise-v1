import { Client } from 'pg';
import { describe, expect, it } from 'vitest';
import { pgConnectionConfig } from '../src/client.ts';

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
