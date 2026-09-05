/*
 * 0042 — eier INSERT/SELECT/UPDATE på services + service_versions
 * under FORCE RLS (tjenestekatalog create/update/deactivate).
 *
 * Prod endwise.no: services.create «Failed query: insert into services
 * (id, tenant_id, name, vehicle_type, …) … EU, mc». Pris/beskrivelse
 * bor på service_versions — create skriver dem i neste INSERT i samme
 * withTenant-tx. De når aldri dit når identitets-INSERT feiler.
 *
 * Schema-policyene er TO authenticated FOR ALL. Eier `endwise` er ikke
 * den rollen. withTenant setter bare app.tenant_id.
 *
 * RETURNING krever SELECT. deactivate/reactivate er UPDATE active.
 * update lukker forrige versjon (valid_to) og INSERTer en ny.
 *
 * CWE-862/863: TO PUBLIC, tabelleier, ≠ authenticated/endwise_app,
 * ikke-tom app.tenant_id, tenant_id = guc. Ingen platform_admin.
 * FORCE RLS urørt. Idempotent. Etter merge: `pnpm db:setup`.
 */
drop policy if exists services_tenant_insert_owner on services;-- > statement-breakpoint
create policy services_tenant_insert_owner on services
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.services'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists services_tenant_select_owner on services;-- > statement-breakpoint
create policy services_tenant_select_owner on services
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.services'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists services_tenant_update_owner on services;-- > statement-breakpoint
create policy services_tenant_update_owner on services
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.services'::regclass
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
       where c.oid = 'public.services'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists service_versions_tenant_insert_owner on service_versions;-- > statement-breakpoint
create policy service_versions_tenant_insert_owner on service_versions
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.service_versions'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists service_versions_tenant_select_owner on service_versions;-- > statement-breakpoint
create policy service_versions_tenant_select_owner on service_versions
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.service_versions'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists service_versions_tenant_update_owner on service_versions;-- > statement-breakpoint
create policy service_versions_tenant_update_owner on service_versions
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.service_versions'::regclass
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
       where c.oid = 'public.service_versions'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

create or replace function services_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.services'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.name is distinct from old.name
     or new.vehicle_type is distinct from old.vehicle_type
     or new.created_at is distinct from old.created_at then
    raise exception 'services: eier-UPDATE kan bare sette active'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists services_owner_update_guard_trg on services;-- > statement-breakpoint
create trigger services_owner_update_guard_trg
  before update on services
  for each row
  execute function services_owner_update_guard();-- > statement-breakpoint

create or replace function service_versions_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.service_versions'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.service_id is distinct from old.service_id
     or new.version is distinct from old.version
     or new.skills is distinct from old.skills
     or new.duration_minutes is distinct from old.duration_minutes
     or new.price_minor is distinct from old.price_minor
     or new.description is distinct from old.description
     or new.valid_from is distinct from old.valid_from then
    raise exception 'service_versions: eier-UPDATE kan bare sette valid_to'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists service_versions_owner_update_guard_trg on service_versions;-- > statement-breakpoint
create trigger service_versions_owner_update_guard_trg
  before update on service_versions
  for each row
  execute function service_versions_owner_update_guard();
