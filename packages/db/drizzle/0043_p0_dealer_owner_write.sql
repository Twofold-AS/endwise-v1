/*
 * 0043 — eier INSERT/SELECT/UPDATE på P0 dealer-skriv under FORCE RLS.
 *
 * Residual etter #128 (services, 0042 på main). Schema-policyene er
 * TO authenticated FOR ALL. Prod APP er eier `endwise`. withTenant
 * setter bare app.tenant_id. INSERT … RETURNING krever også SELECT.
 *
 * CWE-862/863: TO PUBLIC, tabelleier, ≠ authenticated/endwise_app,
 * ikke-tom app.tenant_id, tenant_id = guc. Ingen platform_admin.
 * FORCE RLS urørt. Idempotent. Etter merge: `pnpm db:setup`.
 *
 * Append-only (ingen eier-UPDATE): customer_notes, booking_services,
 * stock_movements. Trigger låser identitet/historikk der UPDATE finnes.
 */
drop policy if exists customers_tenant_insert_owner on customers;
create policy customers_tenant_insert_owner on customers
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists customers_tenant_select_owner on customers;
create policy customers_tenant_select_owner on customers
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists customers_tenant_update_owner on customers;
create policy customers_tenant_update_owner on customers
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.customers'::regclass
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
       where c.oid = 'public.customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists customer_notes_tenant_insert_owner on customer_notes;
create policy customer_notes_tenant_insert_owner on customer_notes
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.customer_notes'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists customer_notes_tenant_select_owner on customer_notes;
create policy customer_notes_tenant_select_owner on customer_notes
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.customer_notes'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists vehicles_tenant_insert_owner on vehicles;
create policy vehicles_tenant_insert_owner on vehicles
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.vehicles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists vehicles_tenant_select_owner on vehicles;
create policy vehicles_tenant_select_owner on vehicles
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.vehicles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists vehicles_tenant_update_owner on vehicles;
create policy vehicles_tenant_update_owner on vehicles
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.vehicles'::regclass
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
       where c.oid = 'public.vehicles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists bookings_tenant_insert_owner on bookings;
create policy bookings_tenant_insert_owner on bookings
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.bookings'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists bookings_tenant_select_owner on bookings;
create policy bookings_tenant_select_owner on bookings
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.bookings'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists bookings_tenant_update_owner on bookings;
create policy bookings_tenant_update_owner on bookings
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.bookings'::regclass
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
       where c.oid = 'public.bookings'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists booking_services_tenant_insert_owner on booking_services;
create policy booking_services_tenant_insert_owner on booking_services
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.booking_services'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists booking_services_tenant_select_owner on booking_services;
create policy booking_services_tenant_select_owner on booking_services
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.booking_services'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists skills_tenant_insert_owner on skills;
create policy skills_tenant_insert_owner on skills
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists skills_tenant_select_owner on skills;
create policy skills_tenant_select_owner on skills
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists skills_tenant_update_owner on skills;
create policy skills_tenant_update_owner on skills
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.skills'::regclass
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
       where c.oid = 'public.skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists mechanic_skills_tenant_insert_owner on mechanic_skills;
create policy mechanic_skills_tenant_insert_owner on mechanic_skills
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.mechanic_skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists mechanic_skills_tenant_select_owner on mechanic_skills;
create policy mechanic_skills_tenant_select_owner on mechanic_skills
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.mechanic_skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists mechanic_skills_tenant_update_owner on mechanic_skills;
create policy mechanic_skills_tenant_update_owner on mechanic_skills
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.mechanic_skills'::regclass
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
       where c.oid = 'public.mechanic_skills'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists threads_tenant_insert_owner on threads;
create policy threads_tenant_insert_owner on threads
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.threads'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists threads_tenant_select_owner on threads;
create policy threads_tenant_select_owner on threads
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.threads'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists threads_tenant_update_owner on threads;
create policy threads_tenant_update_owner on threads
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.threads'::regclass
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
       where c.oid = 'public.threads'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists thread_participants_tenant_insert_owner on thread_participants;
create policy thread_participants_tenant_insert_owner on thread_participants
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.thread_participants'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists thread_participants_tenant_select_owner on thread_participants;
create policy thread_participants_tenant_select_owner on thread_participants
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.thread_participants'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists thread_participants_tenant_update_owner on thread_participants;
create policy thread_participants_tenant_update_owner on thread_participants
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.thread_participants'::regclass
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
       where c.oid = 'public.thread_participants'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists messages_tenant_insert_owner on messages;
create policy messages_tenant_insert_owner on messages
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.messages'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists messages_tenant_select_owner on messages;
create policy messages_tenant_select_owner on messages
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.messages'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists messages_tenant_update_owner on messages;
create policy messages_tenant_update_owner on messages
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.messages'::regclass
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
       where c.oid = 'public.messages'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists notifications_tenant_insert_owner on notifications;
create policy notifications_tenant_insert_owner on notifications
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.notifications'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists notifications_tenant_select_owner on notifications;
create policy notifications_tenant_select_owner on notifications
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.notifications'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists notifications_tenant_update_owner on notifications;
create policy notifications_tenant_update_owner on notifications
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.notifications'::regclass
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
       where c.oid = 'public.notifications'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists parts_tenant_insert_owner on parts;
create policy parts_tenant_insert_owner on parts
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.parts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists parts_tenant_select_owner on parts;
create policy parts_tenant_select_owner on parts
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.parts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists parts_tenant_update_owner on parts;
create policy parts_tenant_update_owner on parts
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.parts'::regclass
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
       where c.oid = 'public.parts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_locations_tenant_insert_owner on stock_locations;
create policy stock_locations_tenant_insert_owner on stock_locations
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_locations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_locations_tenant_select_owner on stock_locations;
create policy stock_locations_tenant_select_owner on stock_locations
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_locations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_locations_tenant_update_owner on stock_locations;
create policy stock_locations_tenant_update_owner on stock_locations
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_locations'::regclass
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
       where c.oid = 'public.stock_locations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_levels_tenant_insert_owner on stock_levels;
create policy stock_levels_tenant_insert_owner on stock_levels
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_levels'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_levels_tenant_select_owner on stock_levels;
create policy stock_levels_tenant_select_owner on stock_levels
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_levels'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_levels_tenant_update_owner on stock_levels;
create policy stock_levels_tenant_update_owner on stock_levels
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_levels'::regclass
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
       where c.oid = 'public.stock_levels'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_movements_tenant_insert_owner on stock_movements;
create policy stock_movements_tenant_insert_owner on stock_movements
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_movements'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stock_movements_tenant_select_owner on stock_movements;
create policy stock_movements_tenant_select_owner on stock_movements
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stock_movements'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
create or replace function customers_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.customers'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at then
    raise exception 'customers: eier-UPDATE kan ikke endre id, tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists customers_owner_update_guard_trg on customers;
create trigger customers_owner_update_guard_trg
  before update on customers
  for each row
  execute function customers_owner_update_guard();-- > statement-breakpoint
create or replace function vehicles_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.vehicles'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at then
    raise exception 'vehicles: eier-UPDATE kan ikke endre id, tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_owner_update_guard_trg on vehicles;
create trigger vehicles_owner_update_guard_trg
  before update on vehicles
  for each row
  execute function vehicles_owner_update_guard();-- > statement-breakpoint
create or replace function bookings_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.bookings'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at
     or new.idempotency_key is distinct from old.idempotency_key
     or new.source is distinct from old.source
     or new.service_version_id is distinct from old.service_version_id then
    raise exception 'bookings: eier-UPDATE kan ikke endre identitet, kilde eller avtalt tjenesteversjon'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_owner_update_guard_trg on bookings;
create trigger bookings_owner_update_guard_trg
  before update on bookings
  for each row
  execute function bookings_owner_update_guard();-- > statement-breakpoint
create or replace function skills_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.skills'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.key is distinct from old.key
     or new.created_at is distinct from old.created_at then
    raise exception 'skills: eier-UPDATE kan ikke endre nøkkel, tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists skills_owner_update_guard_trg on skills;
create trigger skills_owner_update_guard_trg
  before update on skills
  for each row
  execute function skills_owner_update_guard();-- > statement-breakpoint
create or replace function mechanic_skills_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.mechanic_skills'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.mechanic_id is distinct from old.mechanic_id
     or new.skill_key is distinct from old.skill_key then
    raise exception 'mechanic_skills: eier-UPDATE kan ikke endre PK eller tenant_id'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists mechanic_skills_owner_update_guard_trg on mechanic_skills;
create trigger mechanic_skills_owner_update_guard_trg
  before update on mechanic_skills
  for each row
  execute function mechanic_skills_owner_update_guard();-- > statement-breakpoint
create or replace function threads_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.threads'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.kind is distinct from old.kind
     or new.created_at is distinct from old.created_at then
    raise exception 'threads: eier-UPDATE kan ikke endre id, tenant_id, kind eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists threads_owner_update_guard_trg on threads;
create trigger threads_owner_update_guard_trg
  before update on threads
  for each row
  execute function threads_owner_update_guard();-- > statement-breakpoint
create or replace function thread_participants_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.thread_participants'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.thread_id is distinct from old.thread_id
     or new.participant_id is distinct from old.participant_id
     or new.joined_at is distinct from old.joined_at then
    raise exception 'thread_participants: eier-UPDATE kan ikke endre deltakelse eller joined_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists thread_participants_owner_update_guard_trg on thread_participants;
create trigger thread_participants_owner_update_guard_trg
  before update on thread_participants
  for each row
  execute function thread_participants_owner_update_guard();-- > statement-breakpoint
create or replace function messages_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.messages'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.thread_id is distinct from old.thread_id
     or new.author_id is distinct from old.author_id
     or new.body is distinct from old.body
     or new.channel is distinct from old.channel
     or new.direction is distinct from old.direction
     or new.created_at is distinct from old.created_at then
    raise exception 'messages: eier-UPDATE kan ikke endre meldingstekst eller avsender'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_owner_update_guard_trg on messages;
create trigger messages_owner_update_guard_trg
  before update on messages
  for each row
  execute function messages_owner_update_guard();-- > statement-breakpoint
create or replace function notifications_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.notifications'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.channel is distinct from old.channel
     or new.recipient is distinct from old.recipient
     or new.kind is distinct from old.kind
     or new.idempotency_key is distinct from old.idempotency_key
     or new.sent_at is distinct from old.sent_at then
    raise exception 'notifications: eier-UPDATE kan ikke endre identitet eller mottaker'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_owner_update_guard_trg on notifications;
create trigger notifications_owner_update_guard_trg
  before update on notifications
  for each row
  execute function notifications_owner_update_guard();-- > statement-breakpoint
create or replace function parts_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.parts'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at then
    raise exception 'parts: eier-UPDATE kan ikke endre id, tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists parts_owner_update_guard_trg on parts;
create trigger parts_owner_update_guard_trg
  before update on parts
  for each row
  execute function parts_owner_update_guard();-- > statement-breakpoint
create or replace function stock_locations_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.stock_locations'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at then
    raise exception 'stock_locations: eier-UPDATE kan ikke endre id, tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists stock_locations_owner_update_guard_trg on stock_locations;
create trigger stock_locations_owner_update_guard_trg
  before update on stock_locations
  for each row
  execute function stock_locations_owner_update_guard();-- > statement-breakpoint
create or replace function stock_levels_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.stock_levels'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.part_id is distinct from old.part_id
     or new.location_id is distinct from old.location_id then
    raise exception 'stock_levels: eier-UPDATE kan ikke endre id, tenant_id eller lokasjon'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists stock_levels_owner_update_guard_trg on stock_levels;
create trigger stock_levels_owner_update_guard_trg
  before update on stock_levels
  for each row
  execute function stock_levels_owner_update_guard();
