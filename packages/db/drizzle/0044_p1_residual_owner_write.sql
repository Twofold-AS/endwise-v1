/*
 * 0044 — residual eier INSERT/SELECT/UPDATE under FORCE RLS.
 * Residual etter #128/#131 (0042+0043 på main).
 *
 * Schema-policyene er TO authenticated FOR ALL. Prod APP er eier
 * `endwise`. withTenant setter bare app.tenant_id. INSERT … RETURNING
 * krever også SELECT. tenant_modules INSERT krevde platform_admin
 * (createTenant) — setModules / Stripe applySubscription gjør det ikke.
 *
 * CWE-862/863: TO PUBLIC, tabelleier, ≠ authenticated/endwise_app,
 * ikke-tom app.tenant_id, tenant_id = guc. Ingen platform_admin.
 * FORCE RLS urørt. Idempotent. Etter merge: `pnpm db:setup`.
 *
 * Append-only (ingen eier-UPDATE): stream_events, shop_order_lines.
 * Trigger låser identitet der UPDATE finnes.
 */
drop policy if exists dealer_profiles_tenant_insert_owner on dealer_profiles;-- > statement-breakpoint
create policy dealer_profiles_tenant_insert_owner on dealer_profiles
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.dealer_profiles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists dealer_profiles_tenant_select_owner on dealer_profiles;-- > statement-breakpoint
create policy dealer_profiles_tenant_select_owner on dealer_profiles
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.dealer_profiles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists dealer_profiles_tenant_update_owner on dealer_profiles;-- > statement-breakpoint
create policy dealer_profiles_tenant_update_owner on dealer_profiles
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.dealer_profiles'::regclass
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
       where c.oid = 'public.dealer_profiles'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists integration_config_tenant_insert_owner on integration_config;-- > statement-breakpoint
create policy integration_config_tenant_insert_owner on integration_config
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.integration_config'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists integration_config_tenant_select_owner on integration_config;-- > statement-breakpoint
create policy integration_config_tenant_select_owner on integration_config
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.integration_config'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists integration_config_tenant_update_owner on integration_config;-- > statement-breakpoint
create policy integration_config_tenant_update_owner on integration_config
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.integration_config'::regclass
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
       where c.oid = 'public.integration_config'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists widget_keys_tenant_insert_owner on widget_keys;-- > statement-breakpoint
create policy widget_keys_tenant_insert_owner on widget_keys
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.widget_keys'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists widget_keys_tenant_select_owner on widget_keys;-- > statement-breakpoint
create policy widget_keys_tenant_select_owner on widget_keys
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.widget_keys'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists widget_keys_tenant_update_owner on widget_keys;-- > statement-breakpoint
create policy widget_keys_tenant_update_owner on widget_keys
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.widget_keys'::regclass
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
       where c.oid = 'public.widget_keys'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists billing_customers_tenant_insert_owner on billing_customers;-- > statement-breakpoint
create policy billing_customers_tenant_insert_owner on billing_customers
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.billing_customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists billing_customers_tenant_select_owner on billing_customers;-- > statement-breakpoint
create policy billing_customers_tenant_select_owner on billing_customers
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.billing_customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists billing_customers_tenant_update_owner on billing_customers;-- > statement-breakpoint
create policy billing_customers_tenant_update_owner on billing_customers
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.billing_customers'::regclass
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
       where c.oid = 'public.billing_customers'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists sync_conflicts_tenant_insert_owner on sync_conflicts;-- > statement-breakpoint
create policy sync_conflicts_tenant_insert_owner on sync_conflicts
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.sync_conflicts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists sync_conflicts_tenant_select_owner on sync_conflicts;-- > statement-breakpoint
create policy sync_conflicts_tenant_select_owner on sync_conflicts
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.sync_conflicts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists sync_conflicts_tenant_update_owner on sync_conflicts;-- > statement-breakpoint
create policy sync_conflicts_tenant_update_owner on sync_conflicts
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.sync_conflicts'::regclass
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
       where c.oid = 'public.sync_conflicts'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stream_events_tenant_insert_owner on stream_events;-- > statement-breakpoint
create policy stream_events_tenant_insert_owner on stream_events
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stream_events'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists stream_events_tenant_select_owner on stream_events;-- > statement-breakpoint
create policy stream_events_tenant_select_owner on stream_events
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.stream_events'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists shop_orders_tenant_insert_owner on shop_orders;-- > statement-breakpoint
create policy shop_orders_tenant_insert_owner on shop_orders
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.shop_orders'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists shop_orders_tenant_select_owner on shop_orders;-- > statement-breakpoint
create policy shop_orders_tenant_select_owner on shop_orders
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.shop_orders'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists shop_orders_tenant_update_owner on shop_orders;-- > statement-breakpoint
create policy shop_orders_tenant_update_owner on shop_orders
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.shop_orders'::regclass
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
       where c.oid = 'public.shop_orders'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists shop_order_lines_tenant_insert_owner on shop_order_lines;-- > statement-breakpoint
create policy shop_order_lines_tenant_insert_owner on shop_order_lines
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.shop_order_lines'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists shop_order_lines_tenant_select_owner on shop_order_lines;-- > statement-breakpoint
create policy shop_order_lines_tenant_select_owner on shop_order_lines
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.shop_order_lines'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists feature_flag_overrides_tenant_insert_owner on feature_flag_overrides;-- > statement-breakpoint
create policy feature_flag_overrides_tenant_insert_owner on feature_flag_overrides
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.feature_flag_overrides'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists feature_flag_overrides_tenant_select_owner on feature_flag_overrides;-- > statement-breakpoint
create policy feature_flag_overrides_tenant_select_owner on feature_flag_overrides
  as permissive
  for select
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.feature_flag_overrides'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists feature_flag_overrides_tenant_update_owner on feature_flag_overrides;-- > statement-breakpoint
create policy feature_flag_overrides_tenant_update_owner on feature_flag_overrides
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.feature_flag_overrides'::regclass
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
       where c.oid = 'public.feature_flag_overrides'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
drop policy if exists tenant_modules_tenant_insert_owner on tenant_modules;-- > statement-breakpoint
create policy tenant_modules_tenant_insert_owner on tenant_modules
  as permissive
  for insert
  to public
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
drop policy if exists mechanics_tenant_update_owner on mechanics;-- > statement-breakpoint
create policy mechanics_tenant_update_owner on mechanics
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.mechanics'::regclass
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
       where c.oid = 'public.mechanics'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
create or replace function dealer_profiles_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.dealer_profiles'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at then
    raise exception 'dealer_profiles: eier-UPDATE kan ikke endre tenant_id eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists dealer_profiles_owner_update_guard_trg on dealer_profiles;
create trigger dealer_profiles_owner_update_guard_trg
  before update on dealer_profiles
  for each row
  execute function dealer_profiles_owner_update_guard();
-- > statement-breakpoint

create or replace function integration_config_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.integration_config'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.provider is distinct from old.provider
     or new.created_at is distinct from old.created_at then
    raise exception 'integration_config: eier-UPDATE kan ikke endre PK eller created_at'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists integration_config_owner_update_guard_trg on integration_config;
create trigger integration_config_owner_update_guard_trg
  before update on integration_config
  for each row
  execute function integration_config_owner_update_guard();
-- > statement-breakpoint

create or replace function widget_keys_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.widget_keys'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at
     or new.publishable_key is distinct from old.publishable_key then
    raise exception 'widget_keys: eier-UPDATE kan ikke endre id, tenant_id, created_at eller publishable_key'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists widget_keys_owner_update_guard_trg on widget_keys;
create trigger widget_keys_owner_update_guard_trg
  before update on widget_keys
  for each row
  execute function widget_keys_owner_update_guard();
-- > statement-breakpoint

create or replace function mechanics_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.mechanics'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at
     or new.user_id is distinct from old.user_id then
    raise exception 'mechanics: eier-UPDATE kan ikke endre id, tenant_id, created_at eller user_id'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists mechanics_owner_update_guard_trg on mechanics;
create trigger mechanics_owner_update_guard_trg
  before update on mechanics
  for each row
  execute function mechanics_owner_update_guard();
-- > statement-breakpoint

create or replace function billing_customers_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.billing_customers'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'billing_customers: eier-UPDATE kan ikke endre tenant_id'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists billing_customers_owner_update_guard_trg on billing_customers;
create trigger billing_customers_owner_update_guard_trg
  before update on billing_customers
  for each row
  execute function billing_customers_owner_update_guard();
-- > statement-breakpoint

create or replace function sync_conflicts_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.sync_conflicts'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at
     or new.provider is distinct from old.provider
     or new.entity is distinct from old.entity
     or new.entity_id is distinct from old.entity_id
     or new.field is distinct from old.field then
    raise exception 'sync_conflicts: eier-UPDATE kan ikke endre identitet eller konfliktfelt'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_conflicts_owner_update_guard_trg on sync_conflicts;
create trigger sync_conflicts_owner_update_guard_trg
  before update on sync_conflicts
  for each row
  execute function sync_conflicts_owner_update_guard();
-- > statement-breakpoint

create or replace function shop_orders_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.shop_orders'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.created_at is distinct from old.created_at
     or new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception 'shop_orders: eier-UPDATE kan ikke endre id, tenant_id, created_at eller created_by'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists shop_orders_owner_update_guard_trg on shop_orders;
create trigger shop_orders_owner_update_guard_trg
  before update on shop_orders
  for each row
  execute function shop_orders_owner_update_guard();
-- > statement-breakpoint

create or replace function feature_flag_overrides_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  eier text;
begin
  select pg_get_userbyid(c.relowner) into eier
    from pg_class c
   where c.oid = 'public.feature_flag_overrides'::regclass;

  if current_user is distinct from eier then
    return new;
  end if;

  if new.flag_key is distinct from old.flag_key
     or new.tenant_id is distinct from old.tenant_id then
    raise exception 'feature_flag_overrides: eier-UPDATE kan ikke endre PK'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists feature_flag_overrides_owner_update_guard_trg on feature_flag_overrides;
create trigger feature_flag_overrides_owner_update_guard_trg
  before update on feature_flag_overrides
  for each row
  execute function feature_flag_overrides_owner_update_guard();

