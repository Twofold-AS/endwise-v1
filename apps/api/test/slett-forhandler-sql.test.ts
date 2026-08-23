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

  it('TO PUBLIC slett-policyer krever platform_admin OG slett_tenant_id OG ikke-authenticated', () => {
    expect(grants).toMatch(/tenants_platform_admin_read_owner/);
    expect(grants).toMatch(/tenants_slett_forhandler/);
    expect(grants).toMatch(/audit_log_slett_update/);
    expect(grants).toMatch(/app\.slett_tenant_id/);
    expect(grants).toMatch(/to public/i);
    expect(grants).toMatch(/not pg_has_role\(current_user, 'authenticated', 'member'\)/);

    const slettPolicyer = [
      'tenants_slett_forhandler',
      'audit_log_slett_update',
      'audit_log_slett_insert',
      'erasure_requests_slett_forhandler',
    ];
    for (const navn of slettPolicyer) {
      const start = grants.indexOf(`create policy ${navn}`);
      expect(start, navn).toBeGreaterThan(-1);
      const kropp = grants.slice(start, start + 900);
      expect(kropp, navn).toMatch(/app\.platform_admin/);
      expect(kropp, navn).toMatch(/not pg_has_role\(current_user, 'authenticated', 'member'\)/);
      expect(kropp, navn).toMatch(/app\.slett_tenant_id/);
    }

    const dynamisk = grants.slice(grants.indexOf('create policy %I on public.%I'));
    expect(dynamisk).toMatch(/app\.platform_admin/);
    expect(dynamisk).toMatch(/app\.slett_tenant_id/);
    expect(dynamisk).toMatch(/not pg_has_role\(current_user, 'authenticated', 'member'\)/);
  });

  it('WITH CHECK på slett-UPDATE tillater bare slett-GUC eller Endwise-tenant — ikke true', () => {
    expect(grants).not.toMatch(/with check \(true\)/i);

    for (const navn of ['audit_log_slett_update', 'erasure_requests_slett_forhandler']) {
      const start = grants.indexOf(`create policy ${navn}`);
      const kropp = grants.slice(start, start + 1100);
      expect(kropp, navn).toMatch(/with check \(/);
      expect(kropp, navn).toMatch(/app\.slett_tenant_id/);
      expect(kropp, navn).toMatch(/slug = 'endwise'/);
    }
  });

  it('flyttet erasure_request bytter UUID og hasher subjekt/bestiller med sha256 (CWE-359)', () => {
    expect(slettSql).toMatch(/update erasure_requests/);
    expect(slettSql).toMatch(/id\s*=\s*gen_random_uuid\(\)/);
    expect(slettSql).not.toMatch(/md5\s*\(\s*subject_id\s*\)/);
    expect(slettSql).not.toMatch(/md5\s*\(\s*requested_by\s*\)/);
    expect(slettSql).toMatch(/encode\s*\(\s*sha256\s*\(/);
    expect(slettSql).toMatch(/subject_id\s*\|\|[\s\S]{0,40}p_tenant_id/);
    expect(slettSql).toMatch(/requested_by\s*\|\|[\s\S]{0,40}p_tenant_id/);
    expect(slettSql).toMatch(/slettes ALDRI|slettes aldri/);
    expect(slettSql).toMatch(/request_id_rotated/);
    expect(slettSql).not.toMatch(/delete from erasure_requests/i);
  });

  it('tenants.slett mapper Postgres-cause til TRPCError', () => {
    expect(tenantsRouter).toMatch(/mapSlettPostgresFeil/);
    expect(tenantsRouter).toMatch(/loggSlettPostgresFeil/);
  });
});
