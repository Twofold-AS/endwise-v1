import { describe, expect, it } from 'vitest';
import { lesPostgresCause, mapDealerWritePostgresFeil } from '../src/trpc/slett-postgres.ts';

/**
 * Prod-klassen: Drizzle viser «Failed query: insert into "customers" …»
 * + params (tenant_id, navn). UI skal aldri få SQL eller params.
 */

function drizzlePakket(cause: { code?: string; message: string; constraint?: string }) {
  const err = new Error(
    `Failed query: insert into "customers" ("id", "tenant_id", "name") values (default, $1, $2) returning "id" params: 8ba43427-18e2-4777-bf3b-f530f16c0490,Ola Nordmann`,
  );
  (err as Error & { cause: unknown }).cause = cause;
  return err;
}

describe('mapDealerWritePostgresFeil', () => {
  it('pakker ut SQLSTATE fra cause, ikke Drizzle-skallet', () => {
    const pg = lesPostgresCause(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "customers"',
      }),
    );
    expect(pg.code).toBe('42501');
    expect(pg.message).toMatch(/row-level security/);
  });

  it('RLS 42501 lekker ikke SQL, tenant_id eller kundenavn til UI', () => {
    const feil = mapDealerWritePostgresFeil(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "customers"',
      }),
      'Kunne ikke lagre kunden. Prøv igjen.',
    );
    expect(feil.code).toBe('INTERNAL_SERVER_ERROR');
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/insert into/i);
    expect(feil.message).not.toMatch(/8ba43427-18e2-4777-bf3b-f530f16c0490/);
    expect(feil.message).not.toMatch(/Ola Nordmann/);
    expect(feil.message).toMatch(/kunden/i);
  });

  it('ukjent Postgres-feil lekker ikke params', () => {
    const feil = mapDealerWritePostgresFeil(
      drizzlePakket({
        code: '23503',
        message: 'insert or update on table "customer_notes" violates foreign key constraint',
        constraint: 'customer_notes_customer_id_customers_id_fk',
      }),
      'Kunne ikke lagre notatet. Prøv igjen.',
    );
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/customer_notes_customer_id/);
    expect(feil.message).not.toMatch(/8ba43427/);
    expect(feil.message).toMatch(/notatet/i);
  });

  it('lar TRPCError passere urørt', async () => {
    const { TRPCError } = await import('@trpc/server');
    const original = new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke kunden' });
    expect(mapDealerWritePostgresFeil(original, 'Kunne ikke lagre kunden. Prøv igjen.')).toBe(
      original,
    );
  });
});
