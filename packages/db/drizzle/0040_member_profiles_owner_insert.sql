/*
 * 0040 — eier-INSERT/UPDATE på member_profiles + eier-INSERT på mechanics
 * under FORCE RLS.
 *
 * Prod 2026-09-04 04:23 UTC (df94fc3 / #124): POST /invitasjoner/godta
 * 500 etter consume — «Failed query: insert into member_profiles»
 * (tenant 50f690af-…, user f86aa037-…, job_function leder). Retry 410.
 *
 * 0039 ga eier-SELECT. Schema-policyene er TO authenticated FOR ALL.
 * Eier `endwise` er ikke den rollen.
 *
 * godta bruker INSERT … ON CONFLICT DO UPDATE (job_function, updated_at).
 * INSERT alene holder ikke ved konflikt. UPDATE er tenant-scopet
 * (USING + WITH CHECK). Trigger member_profiles_owner_update_guard:
 * som tabelleier kan bare job_function og updated_at endres (PK +
 * nickname låst). authenticated/endwise_app urørt (kallenavn).
 *
 * Mekaniker-invite skriver mechanics (ikke leder). Samme eier-INSERT.
 * RETURNING dekkes av mechanics_tenant_select_owner (0039).
 *
 * Ingen platform_admin. FORCE RLS urørt. Idempotent. Etter merge:
 * `pnpm db:setup`.
 */
drop policy if exists member_profiles_tenant_insert_owner on member_profiles;-- > statement-breakpoint
create policy member_profiles_tenant_insert_owner on member_profiles
  as permissive
  for insert
  to public
  with check (
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

drop policy if exists member_profiles_tenant_update_owner on member_profiles;-- > statement-breakpoint
create policy member_profiles_tenant_update_owner on member_profiles
  as permissive
  for update
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
  )
  with check (
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

create or replace function member_profiles_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.member_profiles'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.user_id is distinct from old.user_id
     or new.nickname is distinct from old.nickname then
    raise exception 'member_profiles: eier-UPDATE kan bare sette job_function og updated_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists member_profiles_owner_update_guard_trg on member_profiles;-- > statement-breakpoint
create trigger member_profiles_owner_update_guard_trg
  before update on member_profiles
  for each row
  execute function member_profiles_owner_update_guard();-- > statement-breakpoint

drop policy if exists mechanics_tenant_insert_owner on mechanics;-- > statement-breakpoint
create policy mechanics_tenant_insert_owner on mechanics
  as permissive
  for insert
  to public
  with check (
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
