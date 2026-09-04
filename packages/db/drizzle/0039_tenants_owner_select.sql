/*
 * 0039 — eier-SELECT under FORCE RLS for withTenant (prod-rolle endwise).
 *
 * Rotårsak (verifisert mot SQL som eier endwise, FORCE RLS):
 * withTenant setter bare app.tenant_id. tenants_self_isolation er TO
 * authenticated. tenants_platform_admin_read_owner krever
 * platform_admin og åpner ALLE tenants. Uten tenant-scopet eier-SELECT
 * ser lesTenantNavn 0 rader → forhandler.kort / onboarding.fullfor
 * NOT_FOUND «Fant ikke forhandleren». Samme klasse som #121 RETURNING.
 *
 * CWE-862/863: TO PUBLIC er leveransen (eier ≠ authenticated).
 * Predikatet er tabelleier + current_user ≠ authenticated/endwise_app
 * + eksplisitt ikke-tom app.tenant_id + id/tenant_id = guc.
 * Ingen platform_admin her — withPlatformAdmin har egen sti
 * (tenants_platform_admin_read_owner). Tom/NULL guc matcher aldri.
 *
 * Login-sti (session.me / forhandler.kort / onboarding): tenants,
 * dealer_profiles, tenant_modules, member_profiles, mechanics.
 *
 * Skrur ikke av FORCE RLS. withTenant setter ikke platform_admin.
 * Idempotent. Etter merge: `pnpm db:setup`.
 */
drop policy if exists tenants_tenant_select_owner on tenants;-- > statement-breakpoint
create policy tenants_tenant_select_owner on tenants
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.tenants'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists dealer_profiles_tenant_select_owner on dealer_profiles;-- > statement-breakpoint
create policy dealer_profiles_tenant_select_owner on dealer_profiles
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.dealer_profiles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists tenant_modules_tenant_select_owner on tenant_modules;-- > statement-breakpoint
create policy tenant_modules_tenant_select_owner on tenant_modules
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.tenant_modules'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists member_profiles_tenant_select_owner on member_profiles;-- > statement-breakpoint
create policy member_profiles_tenant_select_owner on member_profiles
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.member_profiles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists mechanics_tenant_select_owner on mechanics;-- > statement-breakpoint
create policy mechanics_tenant_select_owner on mechanics
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.mechanics'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
