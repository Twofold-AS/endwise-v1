import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-26 / samme klasse som F1-10 (pr #11).
 * Docker-eieren er superuser og bypasser force RLS, så
 * `slett_forhandler` kan se grønt ut lokalt mens Scaleway-eieren `endwise`
 * (ikke superuser) ser 0 rader på `SELECT slug` og deretter ikke får slettet
 * RLS-tabeller. `row_security=off` er ikke fiksen (kaster hvis en policy
 * ville filtrert).
 * Disse kildetestene er stand-in for «force RLS + ikke-superuser eier» i CI.
 */

const her = dirname(fileURLToPath(import.meta.url));
const functions = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const tenantsRouter = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
const slettSql = functions.slice(functions.lastIndexOf('GDPR-slett av en forhandler'));

describe('slett_forhandler FORCE RLS-kontrakt (Scaleway)', () => {
  it('setter transaksjons-lokal GUC før den leser tenants (samme mønster som invitation_hash)', () => {
    expect(slettSql).toMatch(/set_config\('app\.slett_tenant_id'/);
    expect(slettSql).toMatch(/slett_forhandler: krever platform_admin/);
  });

  it('hard-sletter ikke audit_log (F1-06 append-only) og hopper over erasure_requests', () => {
    expect(slettSql).toMatch(/not in \('tenants',\s*'audit_log',\s*'erasure_requests'\)/);
    expect(slettSql).toMatch(/\[REDAKTERT\]/);
  });

  it('sletter dealer-only user-rader og nekter slug endwise', () => {
    expect(slettSql).toMatch(/kan ikke slette Endwise-tenanten/);
    expect(slettSql).toMatch(/u\.id = any\s*\(\s*v_org_user_ids\s*\)/);
    expect(slettSql).toMatch(/delete from verification/);
    expect(slettSql).toMatch(/delete from session where active_organization_id/);
    expect(slettSql).toMatch(/organization_id = v_endwise::text/);
    expect(slettSql).toMatch(/delete from member where organization_id/);
    expect(slettSql).toMatch(/delete from invitation where organization_id/);
    expect(slettSql).toMatch(/delete from organization where id/);
    expect(slettSql).not.toMatch(/enable row level security/i);
    const kropp = slettSql.slice(
      slettSql.search(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i),
    );
    const userDeletes = [...kropp.matchAll(/delete from "user"[^;]*/gi)];
    expect(userDeletes.length).toBeGreaterThan(0);
    for (const m of userDeletes) {
      expect(m[0]).toMatch(/any\s*\(\s*v_org_user_ids/i);
    }
  });

  it('dokumenterer Docker-superuser vs Scaleway (som lookup_open_invitation)', () => {
    expect(slettSql).toMatch(/Force RLS \+ eier som ikke er superuser/);
    expect(slettSql).toMatch(/row_security=off/);
  });

  it('TO PUBLIC slett-policyer krever platform_admin, slett_tenant_id og current_user <> authenticated', () => {
    /**
     * Rotårsak (Scaleway): eieren som CREATE role authenticated er admin
     * av rollen. `pg_has_role(current_user, 'authenticated', 'member')`
     * er da TRUE for DEFINER-eieren → SELECT-policyen matcher aldri →
     * tom SELECT → «finnes ikke». Permissive OR er ikke et hull:
     * `tenants_slett_forhandler_select` er bundet til slett-guc.
     */
    expect(grants).toMatch(/tenants_platform_admin_read_owner/);
    expect(grants).toMatch(/tenants_slett_forhandler/);
    expect(grants).toMatch(/tenants_slett_forhandler_select/);
    expect(grants).toMatch(/audit_log_slett_update/);
    expect(grants).toMatch(/app\.slett_tenant_id/);
    expect(grants).toMatch(/to public/i);
    expect(grants).toMatch(/current_user is distinct from 'authenticated'/);
    expect(grants).toMatch(/current_user is distinct from 'endwise_app'/);
    expect(grants).not.toMatch(/not pg_has_role\(current_user, 'authenticated', 'member'\)/);

    const slettPolicyer = [
      'tenants_slett_forhandler',
      'tenants_slett_forhandler_select',
      'audit_log_slett_update',
      'audit_log_slett_insert',
      'audit_log_slett_select',
      'erasure_requests_slett_forhandler',
      'erasure_requests_slett_select',
    ];
    for (const navn of slettPolicyer) {
      const start = grants.indexOf(`create policy ${navn}`);
      expect(start, navn).toBeGreaterThan(-1);
      const kropp = grants.slice(start, start + 1100);
      expect(kropp, navn).toMatch(/app\.platform_admin/);
      expect(kropp, navn).toMatch(/current_user is distinct from 'authenticated'/);
      expect(kropp, navn).toMatch(/current_user is distinct from 'endwise_app'/);
      expect(kropp, navn).toMatch(/app\.slett_tenant_id/);
    }

    const dynamisk = grants.slice(grants.indexOf('create policy %I on public.%I'));
    expect(dynamisk).toMatch(/app\.platform_admin/);
    expect(dynamisk).toMatch(/app\.slett_tenant_id/);
    expect(dynamisk).toMatch(/current_user is distinct from 'authenticated'/);
    expect(dynamisk).toMatch(/current_user is distinct from 'endwise_app'/);
    expect(dynamisk).toMatch(/for select/);
    expect(dynamisk).toMatch(/_slett_forhandler_select/);
  });

  it('0022 tetter eier-SELECT uten å svekke RLS (idempotent)', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const m0022 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0022_slett_forhandler_eier_select.sql'),
      'utf8',
    );
    const journal = readFileSync(
      resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
      'utf8',
    );
    expect(journal).toMatch(/0022_slett_forhandler_eier_select/);
    expect(m0022).toMatch(/drop policy if exists tenants_slett_forhandler_select/i);
    expect(m0022).toMatch(/create policy tenants_slett_forhandler_select/i);
    expect(m0022).toMatch(/current_user is distinct from 'authenticated'/i);
    expect(m0022).toMatch(/app\.slett_tenant_id/);
    expect(m0022).not.toMatch(/not pg_has_role\(current_user/);
  });

  it('db:migrate bruker scripts/migrate.ts (ikke drizzle-kit spinner som gjemmer feil)', () => {
    const pkg = readFileSync(resolve(her, '../../../packages/db/package.json'), 'utf8');
    const migrate = readFileSync(resolve(her, '../../../packages/db/scripts/migrate.ts'), 'utf8');
    expect(pkg).toMatch(/scripts\/migrate\.ts/);
    expect(pkg).not.toMatch(/drizzle-kit migrate/);
    expect(migrate).toMatch(/pgConnectionConfig/);
    expect(migrate).toMatch(/migrate ferdig/);
  });

  it('WITH CHECK på slett-UPDATE tillater bare slett-GUC eller Endwise-tenant — ikke true', () => {
    expect(grants).not.toMatch(/with check \(true\)/i);

    for (const navn of [
      'audit_log_slett_update',
      'audit_log_slett_insert',
      'erasure_requests_slett_forhandler',
    ]) {
      const start = grants.indexOf(`create policy ${navn}`);
      const kropp = grants.slice(start, start + 1100);
      expect(kropp, navn).toMatch(/with check \(/);
      expect(kropp, navn).toMatch(/app\.slett_tenant_id/);
      expect(kropp, navn).toMatch(/app\.slett_endwise_id/);
      expect(kropp, navn).not.toMatch(/slug = 'endwise'/);
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

  /**
   * Prod, dpl_H7AceMM6rtzDMdE3DqXBXTfY8nCt, trace 80eab6c:
   * HTTP 412, sqlstate 23503, constraint audit_log_tenant_id_tenants_id_fk.
   * Eieren som CREATE role authenticated er admin → to authenticated
   * SELECT-policyer gjelder DEFINER. withPlatformAdmin setter ikke
   * app.tenant_id → SELECT 0 rader → UPDATE flytter 0 audit-rader
   * (stille) → INSERT audit.redacted blir værende på forhandleren →
   * DELETE tenants treffer restrict.
   */
  it('setter app.tenant_id i tillegg til slett-GUC (eier er ADMIN av authenticated)', () => {
    expect(slettSql).toMatch(/set_config\('app\.slett_tenant_id'/);
    expect(slettSql).toMatch(/set_config\('app\.tenant_id'/);
  });

  it('TO PUBLIC SELECT på audit_log og erasure_requests under slett (FORCE RLS)', () => {
    expect(grants).toMatch(/create policy audit_log_slett_select/);
    expect(grants).toMatch(/create policy erasure_requests_slett_select/);
    for (const navn of ['audit_log_slett_select', 'erasure_requests_slett_select']) {
      const start = grants.indexOf(`create policy ${navn}`);
      expect(start, navn).toBeGreaterThan(-1);
      const kropp = grants.slice(start, start + 1100);
      expect(kropp, navn).toMatch(/for select/);
      expect(kropp, navn).toMatch(/app\.platform_admin/);
      expect(kropp, navn).toMatch(/app\.slett_tenant_id/);
      expect(kropp, navn).toMatch(/current_user is distinct from 'authenticated'/);
    }
  });

  it('EXECUTE-slett bruker ROW_COUNT, ikke FOUND (EXECUTE setter ikke FOUND)', () => {
    const barn = slettSql.slice(slettSql.indexOf('Barn først'));
    expect(barn).toMatch(/get diagnostics \w+ = row_count/i);
    expect(barn).not.toMatch(/if found then/);
    expect(barn).toMatch(/parts|stock_levels|customers|tenant_id/);
  });

  it('skriver audit.redacted på Endwise-tenanten, ikke på slett-målet', () => {
    expect(slettSql).toMatch(/insert into audit_log/);
    const insert = slettSql.slice(slettSql.indexOf('insert into audit_log'));
    expect(insert.slice(0, 500)).toMatch(/v_endwise/);
    expect(insert.slice(0, 400)).not.toMatch(/p_tenant_id,/);
  });

  it('0024 tetter slett-SELECT + ROW_COUNT (idempotent)', () => {
    const m0024 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0024_slett_forhandler_barn.sql'),
      'utf8',
    );
    const journal = readFileSync(
      resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
      'utf8',
    );
    expect(journal).toMatch(/0024_slett_forhandler_barn/);
    expect(m0024).toMatch(/create policy audit_log_slett_select/i);
    expect(m0024).toMatch(/get diagnostics/i);
    expect(m0024).toMatch(/create or replace function slett_forhandler/i);
    expect(m0024).not.toMatch(/delete from audit_log/i);
  });

  /**
   * Prod, dpl_98PMuhbM77R4SZJiEPPryVBafJ4X, cdg1, 235 ms,
   * requestId sdwsb-1787599245213-412242917e8b, trace ebf4fcc558a3a1a2dd3e58dcd874dabb.
   * HTTP 412 etter at Mikael kjørte `pnpm db:setup` (0023/0024).
   * 0024 brukte CREATE OR replace med samme signatur. Drizzle-journalen
   * hopper over 0024 når den allerede er merket kjørt — body kan ligge igjen
   * fra før SELECT-policyene / Endwise-INSERT. functions.sql OR replace
   * alene er ikke en verifiserbar «body ble byttet». 0025 DROPper først.
   * Samtidig kodefeil i 0024 selv om body var ny: INSERT/UPDATE with check
   * mot Endwise gikk via `select id from tenants where slug = 'endwise'`
   * under tenants-RLS. Ny rad etter tenant_id-flytt matcher ikke
   * audit_log_slett_select (bare slett-guc). app.slett_endwise_id er guc,
   * ikke subquery.
   */
  it('0025 DROPper slett_forhandler før CREATE (ikke bare OR REPLACE)', () => {
    const m0025 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0025_slett_forhandler_endwise_guc.sql'),
      'utf8',
    );
    const journal = readFileSync(
      resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
      'utf8',
    );
    expect(journal).toMatch(/0025_slett_forhandler_endwise_guc/);
    expect(m0025).toMatch(/drop function if exists slett_forhandler\s*\(\s*uuid\s*\)/i);
    expect(m0025).toMatch(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i);
    const dropAt = m0025.search(/drop function if exists slett_forhandler/i);
    const createAt = m0025.search(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i);
    expect(dropAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(dropAt);
    expect(m0025).not.toMatch(/delete from audit_log/i);
  });

  it('0026 DROPper slett_forhandler før CREATE og sletter dealer-only user', () => {
    const m0026 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0026_slett_forhandler_kontoer.sql'),
      'utf8',
    );
    const journal = readFileSync(
      resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
      'utf8',
    );
    expect(journal).toMatch(/0026_slett_forhandler_kontoer/);
    expect(m0026).toMatch(/drop function if exists slett_forhandler\s*\(\s*uuid\s*\)/i);
    expect(m0026).toMatch(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i);
    const dropAt = m0026.search(/drop function if exists slett_forhandler/i);
    const createAt = m0026.search(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i);
    expect(dropAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(dropAt);
    expect(m0026).toMatch(/slett_forhandler_rev=0026/);
    expect(m0026).toMatch(/set_config\('app\.slett_endwise_id'/);
    expect(m0026).toMatch(/u\.id = any\s*\(\s*v_org_user_ids\s*\)/);
    expect(m0026).toMatch(/Engangs-reparasjon/);
    expect(m0026).not.toMatch(/delete from audit_log/i);
    expect(m0026).not.toMatch(/enable row level security/i);
    const grantAt = m0026.search(/grant execute on function slett_forhandler/i);
    const oneshotAt = m0026.search(/0025 slettet forhandler uten "user"/);
    expect(grantAt).toBeGreaterThan(-1);
    expect(oneshotAt).toBeGreaterThan(grantAt);
    const fnKropp = m0026.slice(
      m0026.search(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i),
      grantAt,
    );
    const fnDeletes = [...fnKropp.matchAll(/delete from "user"[^;]*/gi)];
    expect(fnDeletes.length).toBeGreaterThan(0);
    for (const m of fnDeletes) {
      expect(m[0]).toMatch(/any\s*\(\s*v_org_user_ids/i);
    }
    const dml = m0026.slice(grantAt);
    expect(dml).toMatch(/\bsession\b/);
    expect(dml).toMatch(/\borganization\b/);
    expect(dml).toMatch(/active_organization_id/);
    expect(dml).toMatch(/not exists\s*\(\s*select 1 from organization/i);
    const dmlDeletes = [...dml.matchAll(/delete from (?:verification|"user")[^;]*/gi)];
    expect(dmlDeletes.length).toBeGreaterThanOrEqual(2);
    for (const m of dmlDeletes) {
      expect(m[0]).toMatch(/\bsession\b/);
      expect(m[0]).toMatch(/\borganization\b/);
      expect(m[0]).toMatch(/active_organization_id/);
      expect(m[0]).not.toMatch(
        /delete from "user" u\s+where not exists \(select 1 from member m where m\.user_id = u\.id\)\s*$/i,
      );
    }
  });

  it('functions.sql DROPper slett_forhandler før CREATE og merker rev=0026', () => {
    const dropAt = functions.search(/drop function if exists slett_forhandler\s*\(\s*uuid\s*\)/i);
    const createAt = functions.search(/create(?:\s+or\s+replace)?\s+function slett_forhandler/i);
    expect(dropAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(dropAt);
    expect(slettSql).toMatch(/slett_forhandler_rev=0026/);
    expect(slettSql).toMatch(/set_config\('app\.slett_endwise_id'/);
    expect(slettSql).toMatch(/u\.id = any\s*\(\s*v_org_user_ids\s*\)/);
    expect(slettSql).not.toMatch(/active_organization_id is not null/);
    expect(slettSql).not.toMatch(/delete from "user" u\s+where not exists \(select 1 from member/i);
  });

  it('audit/erasure slett-policyer bruker slett_endwise_id, ikke tenants-subquery', () => {
    expect(grants).toMatch(/app\.slett_endwise_id/);
    for (const navn of [
      'audit_log_slett_update',
      'audit_log_slett_insert',
      'audit_log_slett_select',
      'erasure_requests_slett_forhandler',
      'erasure_requests_slett_select',
    ]) {
      const start = grants.indexOf(`create policy ${navn}`);
      expect(start, navn).toBeGreaterThan(-1);
      const kropp = grants.slice(start, start + 1400);
      expect(kropp, navn).toMatch(/app\.slett_endwise_id/);
      expect(kropp, navn).not.toMatch(/slug = 'endwise'/);
    }
  });

  it('slett-barn sjekker EXISTS på gjenværende rader, ikke bare FK ved DELETE', () => {
    const barn = slettSql.slice(slettSql.indexOf('Barn først'));
    expect(barn).toMatch(/exists\s*\(\s*select 1 from %I where tenant_id/i);
    expect(barn).toMatch(/member where organization_id/);
    expect(barn).toMatch(/constraint_name/i);
  });

  it('db:grants feiler hvis slett_forhandler ikke er rev 0026', () => {
    const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
    expect(grantsTs).toMatch(/slett_forhandler_rev=0026/);
    expect(grantsTs).toMatch(/process\.exit\(1\)/);
    expect(grantsTs).toMatch(
      /grants \+ funksjoner kjørt \(lookup_open_invitation \+ slett_forhandler rev=0026\)/,
    );
    /**
     * pg_get_function_identity_arguments(oid) for
     * `slett_forhandler(p_tenant_id uuid)` returnerer `p_tenant_id uuid`,
     * ikke `uuid`. En eksakt `= 'uuid'`-filter gir 0 rader og exit 1
     * selv når prosrc har rev-markøren (falsk negativ etter DROP+CREATE).
     */
    expect(grantsTs).not.toMatch(
      /pg_get_function_identity_arguments\s*\(\s*p\.oid\s*\)\s*=\s*'uuid'/,
    );
    expect(grantsTs).toMatch(/\bexists\s*\(/i);
    expect(grantsTs).toMatch(/pg_get_function_identity_arguments/);
    expect(grantsTs).toMatch(/left\s*\(\s*p\.prosrc/i);
  });
});
