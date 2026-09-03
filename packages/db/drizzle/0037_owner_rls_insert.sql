/*
 * 0037 — eier-INSERT under force RLS (prod APP_DATABASE_URL = rolle `endwise`).
 *
 * Rotårsak: FORCE RLS gjelder tabelleieren. Schema-policyene er TO
 * authenticated. Eieren er ikke den rollen, så INSERT nektes — Drizzle
 * viser «Failed query: insert into …». withTenant setter app.tenant_id;
 * det holder ikke uten en policy som gjelder eieren.
 *
 * Bekreftet på endwise.no:
 * 1. flags.setGlobal → insert audit_log (feature_flag.set_global)
 * 2. tenants.create → insert tenants (live dealer, enterprise)
 *
 * `tenants_platform_admin_read_owner` er SELECT-only. INSERT/UPDATE som
 * eier ga 0 rader / RLS-brudd selv med app.platform_admin + app.tenant_id.
 * `audit_log_slett_insert` krever slett-GUC — dekker ikke API-mutasjoner.
 *
 * Samme port som slett_forhandler / read_owner: TO PUBLIC, eier-only
 * (current_user <> authenticated/endwise_app). Skrur ikke av FORCE RLS.
 * Append-only på audit_log består (ingen UPDATE/DELETE).
 * Idempotent: DROP IF exists / CREATE. Etter merge: `pnpm db:setup`.
 */
drop policy if exists tenants_platform_admin_insert_owner on tenants;-- > statement-breakpoint
create policy tenants_platform_admin_insert_owner on tenants
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists tenant_modules_platform_admin_insert_owner on tenant_modules;-- > statement-breakpoint
create policy tenant_modules_platform_admin_insert_owner on tenant_modules
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitations_platform_admin_insert_owner on invitations;-- > statement-breakpoint
create policy invitations_platform_admin_insert_owner on invitations
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      or current_setting('app.platform_admin', true) = 'on'
    )
  );-- > statement-breakpoint

drop policy if exists audit_log_tenant_insert_owner on audit_log;-- > statement-breakpoint
create policy audit_log_tenant_insert_owner on audit_log
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      or current_setting('app.platform_admin', true) = 'on'
    )
  );
