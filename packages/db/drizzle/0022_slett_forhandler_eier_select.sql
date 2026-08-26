/*
 * 0022 — slett_forhandler: eier-SELECT under force RLS.
 * Rotårsak: `NOT pg_has_role(current_user, 'authenticated', 'member')` er
 * FALSE for Scaleway-eieren `endwise`. Den som CREATE role authenticated er
 * Admin av rollen, så DEFINER-SELECT på tenants.slug returnerer 0 rader
 * («finnes ikke» / «Fant ikke forhandleren»).
 * Permissive OR er ikke et hull. Ny SELECT-policy er bundet til
 * app.slett_tenant_id. App-rollen (authenticated / endwise_app) matcher ikke.
 * Idempotent: DROP IF exists / CREATE. 0021 røres ikke.
 * Etter merge: `pnpm db:setup` (migrate + grants).
 */
drop policy if exists tenants_platform_admin_read_owner on tenants;-- > statement-breakpoint
create policy tenants_platform_admin_read_owner on tenants
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
  );-- > statement-breakpoint

drop policy if exists tenants_slett_forhandler_select on tenants;-- > statement-breakpoint
create policy tenants_slett_forhandler_select on tenants
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists tenants_slett_forhandler on tenants;-- > statement-breakpoint
create policy tenants_slett_forhandler on tenants
  as permissive
  for delete
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists audit_log_slett_update on audit_log;-- > statement-breakpoint
create policy audit_log_slett_update on audit_log
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );-- > statement-breakpoint

drop policy if exists audit_log_slett_insert on audit_log;-- > statement-breakpoint
create policy audit_log_slett_insert on audit_log
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists erasure_requests_slett_forhandler on erasure_requests;-- > statement-breakpoint
create policy erasure_requests_slett_forhandler on erasure_requests
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );-- > statement-breakpoint

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity
       and a.attname = 'tenant_id'
       and not a.attisdropped
       and c.relname not in ('tenants', 'audit_log', 'erasure_requests')
  loop
    execute format('drop policy if exists %I on public.%I', r.relname || '_slett_forhandler', r.relname);
    execute format(
      $sql$
        create policy %I on public.%I
          as permissive for delete to public
          using (
            current_setting('app.platform_admin', true) = 'on'
            and current_user is distinct from 'authenticated'
            and current_user is distinct from 'endwise_app'
            and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
          )
      $sql$,
      r.relname || '_slett_forhandler',
      r.relname
    );
  end loop;
end $$;
