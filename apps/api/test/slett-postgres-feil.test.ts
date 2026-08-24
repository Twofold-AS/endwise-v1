import { describe, expect, it } from 'vitest';
import { lesPostgresCause, mapSlettPostgresFeil } from '../src/trpc/slett-postgres.ts';

/**
 * F5-26 — Drizzle sluker Postgres-årsaken. Disse testene er rene (ingen DB)
 * og ville ha gjort 500-en på endwise.no lesbar: `cause.message` i stedet for
 * bare «Failed query: select slett_forhandler($1::uuid)».
 */

function drizzlePakket(cause: { code?: string; message: string; constraint?: string }) {
  const err = new Error(`Failed query: select slett_forhandler($1::uuid)\nparams: :abc`);
  (err as Error & { cause: unknown }).cause = cause;
  return err;
}

describe('mapSlettPostgresFeil', () => {
  it('pakker ut cause, ikke Drizzle-skallet', () => {
    const pg = lesPostgresCause(
      drizzlePakket({ code: 'P0001', message: 'slett_forhandler: finnes ikke' }),
    );
    expect(pg.code).toBe('P0001');
    expect(pg.message).toBe('slett_forhandler: finnes ikke');
  });

  it('0 rader under FORCE RLS (SELECT slug) → NOT_FOUND, ikke Failed query', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({ code: 'P0001', message: 'slett_forhandler: finnes ikke' }),
    );
    expect(feil).toMatchObject({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren.' });
  });

  it('Endwise-lås og manglende platform_admin → FORBIDDEN', () => {
    expect(
      mapSlettPostgresFeil(
        drizzlePakket({
          code: 'P0001',
          message: 'slett_forhandler: kan ikke slette Endwise-tenanten',
        }),
      ),
    ).toMatchObject({ code: 'FORBIDDEN' });
    expect(
      mapSlettPostgresFeil(
        drizzlePakket({ code: 'P0001', message: 'slett_forhandler: krever platform_admin' }),
      ),
    ).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('undefined_function (42883) peker på db:setup', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({ code: '42883', message: 'function slett_forhandler(uuid) does not exist' }),
    );
    expect(feil.code).toBe('PRECONDITION_FAILED');
    expect(feil.message).toMatch(/db:setup/);
  });

  it('RLS / insufficient_privilege (42501) peker på grants', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({
        code: '42501',
        message: 'query would be affected by row-level security policy',
      }),
    );
    expect(feil.code).toBe('PRECONDITION_FAILED');
    expect(feil.message).toMatch(/RLS/);
  });

  it('FK-rest (23503) er ærlig, ikke svelget', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({
        code: '23503',
        message: 'update or delete on table "tenants" violates foreign key constraint',
        constraint: 'audit_log_tenant_id_tenants_id_fk',
      }),
    );
    expect(feil.code).toBe('PRECONDITION_FAILED');
    expect(feil.message).toMatch(/koblinger/);
    expect(feil.message).toMatch(/audit_log/);
  });

  it('slett_forhandler-melding om gjenværende tabeller er 412, ikke 500', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({
        code: 'P0001',
        message: 'slett_forhandler: gjenværende koblinger i parts, stock_levels',
      }),
    );
    expect(feil.code).toBe('PRECONDITION_FAILED');
    expect(feil.message).toMatch(/parts/);
    expect(feil.message).not.toMatch(/Failed query/);
  });

  it('ærlig 412 navngir member når org-kobling gjenstår', () => {
    const feil = mapSlettPostgresFeil(
      drizzlePakket({
        code: '23503',
        message: 'slett_forhandler: gjenværende koblinger i member',
      }),
    );
    expect(feil.code).toBe('PRECONDITION_FAILED');
    expect(feil.message).toMatch(/member/);
  });

  it('viser Postgres-teksten til admin, aldri Drizzle-skallet', () => {
    const medCause = mapSlettPostgresFeil(
      drizzlePakket({ code: 'P0001', message: 'slett_forhandler: tenanten ble ikke slettet' }),
    );
    expect(medCause.message).toContain('tenanten ble ikke slettet');
    expect(medCause.message).not.toMatch(/Failed query/);

    const utenCause = mapSlettPostgresFeil(
      new Error('Failed query: select slett_forhandler($1::uuid)'),
    );
    expect(utenCause.code).toBe('INTERNAL_SERVER_ERROR');
    expect(utenCause.message).not.toMatch(/select slett_forhandler/);
  });
});
