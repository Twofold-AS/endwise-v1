/*
 * 0041 — eier-UPDATE på tenants / tenant_modules under FORCE RLS
 * (onboarding.fullfor) + eier-SELECT på invitations uten platform_admin
 * (staff-invite RETURNING fra Team-steget).
 *
 * 0039 ga eier-SELECT. NOT_FOUND «Fant ikke forhandleren» er fremdeles
 * SELECT (lesTenantNavn / fullfor tenant-select), ikke UPDATE. Etter at
 * SELECT treffer, fullfor gjør UPDATE name + onboarding_completed_at
 * og ev. tenant_modules.enabled/source. Eier har INSERT (0037, krever
 * platform_admin) men ingen tenant-scopet UPDATE.
 *
 * invitations_platform_admin_select_owner krever platform_admin.
 * invitasjoner.opprett (staff) setter bare app.tenant_id — INSERT …
 * RETURNING og listApne trenger eier-SELECT uten den GUC-en.
 *
 * CWE-862/863: TO PUBLIC, tabelleier, ≠ authenticated/endwise_app,
 * ikke-tom app.tenant_id, id/tenant_id = guc. Ingen platform_admin.
 * USING + WITH CHECK. Trigger låser id/created_at/plan/kind
 * (dealer kan ikke flippe pakke). FORCE RLS urørt. Idempotent. Etter merge:
 * `pnpm db:setup`.
 */
drop policy if exists tenants_tenant_update_owner on tenants;-- > statement-breakpoint
create policy tenants_tenant_update_owner on tenants
  as permissive
  for update
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
  )
  with check (
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

drop policy if exists tenant_modules_tenant_update_owner on tenant_modules;-- > statement-breakpoint
create policy tenant_modules_tenant_update_owner on tenant_modules
  as permissive
  for update
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
  )
  with check (
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

drop policy if exists invitations_tenant_select_owner on invitations;-- > statement-breakpoint
create policy invitations_tenant_select_owner on invitations
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

create or replace function tenants_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.tenants'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.plan is distinct from old.plan
     or new.kind is distinct from old.kind then
    raise exception 'tenants: eier-UPDATE kan ikke endre id, created_at, plan eller kind'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists tenants_owner_update_guard_trg on tenants;-- > statement-breakpoint
create trigger tenants_owner_update_guard_trg
  before update on tenants
  for each row
  execute function tenants_owner_update_guard();-- > statement-breakpoint

create or replace function tenant_modules_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.tenant_modules'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.module_key is distinct from old.module_key
     or new.created_at is distinct from old.created_at then
    raise exception 'tenant_modules: eier-UPDATE kan ikke endre PK eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists tenant_modules_owner_update_guard_trg on tenant_modules;-- > statement-breakpoint
create trigger tenant_modules_owner_update_guard_trg
  before update on tenant_modules
  for each row
  execute function tenant_modules_owner_update_guard();
