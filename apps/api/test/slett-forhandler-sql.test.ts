import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-26 / samme klasse som F1-10 (PR #11).
 *
 * Docker-eieren er superuser og bypasser FORCE RLS, så
 * `slett_forhandler` kan se grønt ut lokalt mens Scaleway-eieren `endwise`
 * (ikke superuser) ser 0 rader på `SELECT slug` og deretter ikke får slettet
 * RLS-tabeller. `row_security=off` er ikke fiksen (kaster hvis en policy
 * ville filtrert).
 *
 * Disse kildetestene er stand-in for «FORCE RLS + ikke-superuser eier» i CI.
 */

const her = dirname(fileURLToPath(import.meta.url));
const functions = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const tenantsRouter = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
const slettSql = functions.slice(functions.lastIndexOf('F5-26 — GDPR-slett'));

describe('slett_forhandler FORCE RLS-kontrakt (Scaleway)', () => {
  it('setter transaksjons-lokal GUC før den leser tenants (samme mønster som invitation_hash)', () => {
    expect(slettSql).toMatch(/set_config\('app\.slett_tenant_id'/);
    expect(slettSql).toMatch(/slett_forhandler: krever platform_admin/);
  });

  it('hard-sletter ikke audit_log (F1-06 append-only) og hopper over erasure_requests', () => {
    expect(slettSql).toMatch(/not in \('tenants',\s*'audit_log',\s*'erasure_requests'\)/);
    expect(slettSql).toMatch(/\[REDAKTERT\]/);
  });

  it('sletter ikke user-rader og nekter slug endwise', () => {
    expect(slettSql).toMatch(/kan ikke slette Endwise-tenanten/);
    expect(slettSql).not.toMatch(/delete from ["']?user["']?/i);
    expect(slettSql).toMatch(/delete from member where organization_id/);
    expect(slettSql).toMatch(/delete from invitation where organization_id/);
    expect(slettSql).toMatch(/delete from organization where id/);
  });

  it('dokumenterer Docker-superuser vs Scaleway (som lookup_open_invitation)', () => {
    expect(slettSql).toMatch(/FORCE RLS \+ eier som IKKE er superuser/);
    expect(slettSql).toMatch(/row_security=off/);
  });

  it('grants.sql har TO PUBLIC-policyer gated på GUC, ikke platform_admin-DELETE', () => {
    expect(grants).toMatch(/tenants_platform_admin_read_owner/);
    expect(grants).toMatch(/tenants_slett_forhandler/);
    expect(grants).toMatch(/audit_log_slett_update/);
    expect(grants).toMatch(/app\.slett_tenant_id/);
    expect(grants).toMatch(/to public/i);
    expect(grants).toMatch(/not pg_has_role\(current_user, 'authenticated', 'member'\)/);
    expect(grants).not.toMatch(
      /create policy \S+_slett_forhandler[\s\S]{0,200}for delete[\s\S]{0,200}platform_admin/,
    );
  });

  it('tenants.slett mapper Postgres-cause til TRPCError', () => {
    expect(tenantsRouter).toMatch(/mapSlettPostgresFeil/);
    expect(tenantsRouter).toMatch(/loggSlettPostgresFeil/);
  });
});
