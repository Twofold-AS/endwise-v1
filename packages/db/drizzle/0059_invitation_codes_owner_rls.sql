/*
 * 0059 — invitation_codes under FORCE RLS (prod APP = eier `endwise`).
 * Policyene i 0045 er TO authenticated. Eieren er ikke den rollen, så
 * send-kode INSERT/UPDATE feiler 42501. Feilen svelges (alltid 200) —
 * mottaker ser «kode sendt» uten e-post. Samme eier-port som 0037/0039.
 */
drop policy if exists invitation_codes_tenant_select_owner on invitation_codes;-- > statement-breakpoint
create policy invitation_codes_tenant_select_owner on invitation_codes
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitation_codes'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitation_codes_tenant_insert_owner on invitation_codes;-- > statement-breakpoint
create policy invitation_codes_tenant_insert_owner on invitation_codes
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitation_codes'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

drop policy if exists invitation_codes_tenant_update_owner on invitation_codes;-- > statement-breakpoint
create policy invitation_codes_tenant_update_owner on invitation_codes
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitation_codes'::regclass
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
       where c.oid = 'public.invitation_codes'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
