import { describe, expect, it } from 'vitest';
import { lesPostgresCause, mapCreatePostgresFeil } from '../src/trpc/slett-postgres.ts';

/**
 * Prod 2026-09-03 14:20:04Z: tRPC viste «Failed query: insert into
 * invitations» + params (tenant_id, e-post). Drizzle gjemmer SQLSTATE i
 * error.cause. UI skal aldri få SQL, params eller e-post. Serverloggen
 * får kode + constraint.
 */

function drizzlePakket(cause: { code?: string; message: string; constraint?: string }) {
  const err = new Error(
    `Failed query: insert into "invitations" ("tenant_id", "email", "kind") values ($1, $2, $3)\nparams: 4bba521c-1326-4f54-8a9a-13ee44340968,mikael_rk@hotmail.com,owner`,
  );
  (err as Error & { cause: unknown }).cause = cause;
  return err;
}

describe('mapCreatePostgresFeil', () => {
  it('pakker ut SQLSTATE fra cause, ikke Drizzle-skallet', () => {
    const pg = lesPostgresCause(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "invitations"',
      }),
    );
    expect(pg.code).toBe('42501');
    expect(pg.message).toMatch(/row-level security/);
  });

  it('RLS 42501 lekker ikke SQL, e-post eller tenant_id til UI', () => {
    const feil = mapCreatePostgresFeil(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "invitations"',
      }),
    );
    expect(feil.code).toBe('INTERNAL_SERVER_ERROR');
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/insert into/i);
    expect(feil.message).not.toMatch(/mikael_rk@hotmail\.com/);
    expect(feil.message).not.toMatch(/4bba521c-1326-4f54-8a9a-13ee44340968/);
    expect(feil.message).toMatch(/db:setup|forhandler/i);
  });

  it('FK 23503 og CHECK 23514 lekker ikke params', () => {
    const fk = mapCreatePostgresFeil(
      drizzlePakket({
        code: '23503',
        message: 'insert or update on table "invitations" violates foreign key constraint',
        constraint: 'invitations_tenant_id_tenants_id_fk',
      }),
    );
    expect(fk.message).not.toMatch(/Failed query/);
    expect(fk.message).not.toMatch(/mikael_rk/);
    expect(fk.message).not.toMatch(/hotmail/);

    const check = mapCreatePostgresFeil(
      drizzlePakket({
        code: '23514',
        message:
          'new row for relation "invitations" violates check constraint "invitations_role_by_kind"',
        constraint: 'invitations_role_by_kind',
      }),
    );
    expect(check.message).not.toMatch(/Failed query/);
    expect(check.message).not.toMatch(/invitations_role_by_kind/);
  });

  it('lar TRPCError passere urørt', async () => {
    const { TRPCError } = await import('@trpc/server');
    const original = new TRPCError({ code: 'CONFLICT', message: 'Slug «x» er allerede i bruk' });
    expect(mapCreatePostgresFeil(original)).toBe(original);
  });

  it('resendOwnerInvite-feil lekker ikke SQL eller params (CWE-209/497)', () => {
    const feil = mapCreatePostgresFeil(
      drizzlePakket({
        code: '42501',
        message: 'new row violates row-level security policy for table "invitations"',
      }),
    );
    expect(feil.message).toMatch(/forhandler-invitasjon/i);
    expect(feil.message).not.toMatch(/Failed query/);
    expect(feil.message).not.toMatch(/insert into/i);
    expect(feil.message).not.toMatch(/params:/i);
    expect(feil.message).not.toMatch(/mikael_rk@hotmail\.com/);
    expect(feil.message).not.toMatch(/select revoke_open_owner_invitations/i);
  });
});
