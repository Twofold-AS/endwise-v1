import { describe, expect, it } from 'vitest';
import { lesPostgresCause, mapTjenestePostgresFeil } from '../src/trpc/slett-postgres.ts';

/**
 * Prod endwise.no: tRPC viste «Failed query: insert into "services" …»
 * + params (tenant_id, name, vehicle_type). UI skal aldri få SQL eller params.
 */

function drizzlePakket(cause: { code?: string; message: string; constraint?: string }) {
  const err = new Error(
    `Failed query: insert into "services" ("id", "tenant_id", "name", "vehicle_type", "active", "created_at") values (default, $1, $2, $3, default, default) returning "id", "tenant_id", "name", "vehicle_type", "active", "created_at" params: 8ba43427-18e2-4777-bf3b-f530f16c0490,EU,mc`,
  );
  (err as Error & { cause: unknown }).cause = cause;
  return err;
}

describe('mapTjenestePostgresFeil', () => {
  it('pakker ut SQLSTATE fra cause, ikke Drizzle-skallet', () => {
    const pg = lesPostgresCause(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "services"',
      }),
    );
    expect(pg.code).toBe('42501');
    expect(pg.message).toMatch(/row-level security/);
  });

  it('RLS 42501 lekker ikke SQL, tenant_id eller tjenestenavn til UI', () => {
    const feil = mapTjenestePostgresFeil(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "services"',
      }),
    );
    expect(feil.code).toBe('INTERNAL_SERVER_ERROR');
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/insert into/i);
    expect(feil.message).not.toMatch(/8ba43427-18e2-4777-bf3b-f530f16c0490/);
    expect(feil.message).not.toMatch(/,EU,/);
    expect(feil.message).toMatch(/tjenesten/i);
  });

  it('ukjent Postgres-feil lekker ikke params', () => {
    const feil = mapTjenestePostgresFeil(
      drizzlePakket({
        code: '23503',
        message: 'insert or update on table "service_versions" violates foreign key constraint',
        constraint: 'service_versions_service_id_services_id_fk',
      }),
    );
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/service_versions_service_id/);
    expect(feil.message).not.toMatch(/8ba43427/);
    expect(feil.message).toMatch(/tjenesten/i);
  });

  it('lar TRPCError passere urørt', async () => {
    const { TRPCError } = await import('@trpc/server');
    const original = new TRPCError({ code: 'NOT_FOUND', message: 'Tjenesten finnes ikke' });
    expect(mapTjenestePostgresFeil(original)).toBe(original);
  });
});
