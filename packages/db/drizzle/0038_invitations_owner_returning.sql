/*
 * 0038 — eier-SELECT for INSERT … RETURNING + smalt eier-revoke.
 *
 * Etter 0037 + #120: INSERT WITH CHECK passerer. opprettEier bruker
 * INSERT … RETURNING. Eier `endwise` under FORCE RLS har ingen SELECT
 * som matcher → 42501. Drizzle viser «Failed query: insert into invitations».
 *
 * CWE-862/863: SELECT krever tabelleier + platform_admin-markør +
 * eksplisitt tenant_id (NULL/tom guc matcher aldri). TO PUBLIC er
 * leveransen (eier ≠ authenticated), ikke åpen tilgang.
 *
 * CWE-807/862: ingen DEFINER-revoke, ingen hjelpe-GUC som authz.
 * Tilbakekall er app-kode i endwiseAdminProcedure + withTenant.
 * invitations_owner_revoke_update krever tabelleier + tenant_id IS NOT NULL.
 * Trigger invitations_immutable_fields: bare engangs revoked_at XOR
 * accepted_at. expires_at/id/created_at og øvrige felt er låst.
 *
 * Idempotent. v1/v2 DROP-es. Etter merge: `pnpm db:setup`.
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
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitations_platform_admin_update_owner on invitations;-- > statement-breakpoint

drop policy if exists invitations_revoke_owner_update on invitations;-- > statement-breakpoint
drop policy if exists invitations_owner_revoke_update on invitations;-- > statement-breakpoint
create policy invitations_owner_revoke_update on invitations
  as permissive
  for update
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
  )
  with check (
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

drop function if exists revoke_open_owner_invitations(text);-- > statement-breakpoint

create or replace function invitations_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  revoke_only boolean;
  accept_only boolean;
begin
  revoke_only :=
    old.revoked_at is null
    and new.revoked_at is not null
    and new.accepted_at is not distinct from old.accepted_at;
  accept_only :=
    old.accepted_at is null
    and new.accepted_at is not null
    and new.revoked_at is not distinct from old.revoked_at;

  if not revoke_only and not accept_only then
    raise exception 'invitations: bare engangs revoked_at eller accepted_at'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.email is distinct from old.email
     or new.token_hash is distinct from old.token_hash
     or new.kind is distinct from old.kind
     or new.role is distinct from old.role
     or new.job_function is distinct from old.job_function
     or new.platform_level is distinct from old.platform_level
     or new.invited_by is distinct from old.invited_by
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'invitations: id, tenant, e-post, hash, kind, rolle, utløp og created_at er låst'
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
