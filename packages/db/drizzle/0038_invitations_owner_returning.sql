/*
 * 0038 — eier-SELECT for INSERT … RETURNING + smalt eier-revoke.
 *
 * Etter 0037 + #120: INSERT WITH CHECK passerer. opprettEier bruker
 * INSERT … RETURNING. Eier `endwise` under FORCE RLS har ingen SELECT
 * som matcher → 42501. Drizzle viser «Failed query: insert into invitations».
 *
 * CWE-862/863: SELECT krever tabelleier + platform_admin + tenant_id.
 * TO PUBLIC er leveransen (eier ≠ authenticated), ikke åpen tilgang.
 *
 * CWE-915: ingen bred eier-UPDATE. Tilbakekall går via
 * revoke_open_owner_invitations (DEFINER, search_path public, kun
 * revoked_at). FORCE RLS krever rad-synlighet: invitations_revoke_owner_update
 * er bundet til app.invite_revoke_tenant (ikke tenant_id alene).
 * Trigger invitations_immutable_fields låser e-post/hash/kind/rolle.
 *
 * Idempotent. Første utkast DROP-es. Etter merge: `pnpm db:setup`.
 */
drop policy if exists invitations_platform_admin_select_owner on invitations;-- > statement-breakpoint
create policy invitations_platform_admin_select_owner on invitations
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitations'::regclass
    )
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitations_platform_admin_update_owner on invitations;-- > statement-breakpoint

drop policy if exists invitations_revoke_owner_update on invitations;-- > statement-breakpoint
create policy invitations_revoke_owner_update on invitations
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.invite_revoke_tenant', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.invite_revoke_tenant', true), '')::uuid
  );-- > statement-breakpoint

drop function if exists revoke_open_owner_invitations(text);-- > statement-breakpoint
create function revoke_open_owner_invitations(p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_count integer;
  v_owner name;
begin
  -- revoke_open_owner_invitations_rev=0038
  if current_setting('app.platform_admin', true) is distinct from 'on' then
    raise exception 'revoke_open_owner_invitations: krever platform_admin';
  end if;

  v_tenant := nullif(current_setting('app.tenant_id', true), '')::uuid;
  if v_tenant is null then
    raise exception 'revoke_open_owner_invitations: ingen tenant-kontekst';
  end if;

  select pg_get_userbyid(c.relowner) into v_owner
    from pg_class c
   where c.oid = 'public.invitations'::regclass;
  if session_user is distinct from 'authenticated'
     and session_user is distinct from 'endwise_app'
     and session_user is distinct from v_owner then
    raise exception 'revoke_open_owner_invitations: ikke autorisert';
  end if;

  perform set_config('app.invite_revoke_tenant', v_tenant::text, true);

  update invitations
     set revoked_at = now()
   where tenant_id = v_tenant
     and kind = 'owner'
     and accepted_at is null
     and revoked_at is null
     and (
       p_email is null
       or p_email = ''
       or email = lower(trim(p_email))
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;-- > statement-breakpoint

revoke all on function revoke_open_owner_invitations(text) from public;-- > statement-breakpoint
grant execute on function revoke_open_owner_invitations(text) to authenticated;-- > statement-breakpoint

create or replace function invitations_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     or new.token_hash is distinct from old.token_hash
     or new.kind is distinct from old.kind
     or new.role is distinct from old.role
     or new.job_function is distinct from old.job_function
     or new.platform_level is distinct from old.platform_level
     or new.tenant_id is distinct from old.tenant_id
     or new.invited_by is distinct from old.invited_by then
    raise exception 'invitations: e-post, hash, kind, rolle og tenant er låst'
      using errcode = '42501';
  end if;
  return new;
end;
$$;-- > statement-breakpoint

drop trigger if exists invitations_immutable_fields_trg on invitations;-- > statement-breakpoint
create trigger invitations_immutable_fields_trg
  before update on invitations
  for each row
  execute function invitations_immutable_fields();
