/*
 * 0040 — eier-INSERT på member_profiles under FORCE RLS.
 *
 * Prod 2026-09-04 04:23 UTC (df94fc3 / #124): POST /invitasjoner/godta
 * 500 etter consume — «Failed query: insert into member_profiles»
 * (tenant 50f690af-…, user f86aa037-…, job_function leder). Retry 410.
 *
 * 0039 ga eier-SELECT (session.me). Schema-policyen er TO authenticated
 * FOR ALL. Eier `endwise` er ikke den rollen, så INSERT nektes.
 * Ingen platform_admin: godta går i withTenant (app.tenant_id), ikke
 * withPlatformAdmin. TO PUBLIC / eier-only / ikke-tom tenant-guc.
 * RETURNING dekkes av member_profiles_tenant_select_owner (0039).
 *
 * Skrur ikke av FORCE RLS. Idempotent. Etter merge: `pnpm db:setup`.
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
  );
