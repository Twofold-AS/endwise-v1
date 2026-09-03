/*
 * 0038 — eier-SELECT/UPDATE på invitations under FORCE RLS.
 *
 * Etter 0037 + #120: INSERT WITH CHECK passerer (platform_admin +
 * tenant_id). opprettEier bruker INSERT … RETURNING. Postgres krever
 * at den nye raden også matcher en SELECT-policy. Eier `endwise` har
 * ingen: tenant_isolation er TO authenticated, open_by_hash krever
 * invitation_hash, slett_select krever slett-GUC.
 *
 * Resultat på endwise.no 2026-09-03 14:20:04Z: 500
 * «Failed query: insert into invitations» (SQLSTATE 42501 i cause).
 *
 * SELECT/UPDATE er tenant-skopet (app.tenant_id). Ikke platform_admin
 * alene — det ville lest/endret alle invitasjoner. FORCE RLS urørt.
 * App-rollen (authenticated / endwise_app) matcher ikke.
 * Idempotent: DROP IF exists / CREATE. Etter merge: `pnpm db:setup`.
 */
drop policy if exists invitations_platform_admin_select_owner on invitations;-- > statement-breakpoint
create policy invitations_platform_admin_select_owner on invitations
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitations_platform_admin_update_owner on invitations;-- > statement-breakpoint
create policy invitations_platform_admin_update_owner on invitations
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
