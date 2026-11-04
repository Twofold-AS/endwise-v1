/*
 * 0057 — White label gå live (Mikael 04.11.2026).
 * 1) Sikre Endwise-plattformtenanten.
 * 2) Seed mikkis@twofold.no som endwise_admin.
 * 3) Slett eksisterende forhandlere (godkjent fresh start).
 * Idempotent via drizzle-journal. Kjører som eier ved db:migrate.
 *
 * Prod-eier har FORCE RLS og ikke BYPASSRLS (91c96b6: 42501 på
 * tenants INSERT). tenants_platform_admin_insert_owner krever
 * app.platform_admin=on og app.tenant_id = ny id. SELECT uten GUC
 * treffer ikke tenants_slug_oppslag (krever app.slug_sjekk) —
 * EXISTS ble usynlig og INSERT ble forsøkt. Sett GUC først.
 */
DO $$
DECLARE
  v_org text;
  v_id uuid;
  v_user text;
  r record;
BEGIN
  PERFORM set_config('app.platform_admin', 'on', true);

  SELECT id INTO v_org FROM organization WHERE slug = 'endwise' LIMIT 1;
  IF v_org IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO organization (id, name, slug, created_at)
    VALUES (v_id::text, 'Endwise', 'endwise', now());
    v_org := v_id::text;
  ELSIF v_org ~ '^[0-9a-fA-F-]{36}$' THEN
    v_id := v_org::uuid;
  ELSE
    SELECT id INTO v_id FROM tenants WHERE slug = 'endwise' LIMIT 1;
    IF v_id IS NULL THEN
      RAISE EXCEPTION '0057: Endwise-org har ikke UUID-id og tenants-rad mangler';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE slug = 'endwise') THEN
    SELECT id INTO v_id FROM tenants WHERE slug = 'endwise' LIMIT 1;
    PERFORM set_config('app.tenant_id', v_id::text, true);
    UPDATE tenants
       SET name = 'Endwise',
           onboarding_completed_at = COALESCE(onboarding_completed_at, now())
     WHERE id = v_id;
    IF EXISTS (
      SELECT 1 FROM tenants
       WHERE id = v_id
         AND (kind IS DISTINCT FROM 'platform' OR plan IS NOT NULL)
    ) THEN
      ALTER TABLE tenants DISABLE TRIGGER tenants_owner_update_guard_trg;
      UPDATE tenants SET kind = 'platform', plan = NULL WHERE id = v_id;
      ALTER TABLE tenants ENABLE TRIGGER tenants_owner_update_guard_trg;
    END IF;
    SELECT id INTO v_org FROM organization WHERE slug = 'endwise' LIMIT 1;
  ELSE
    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
    END IF;
    PERFORM set_config('app.tenant_id', v_id::text, true);
    INSERT INTO tenants (id, name, slug, kind, plan, onboarding_completed_at)
    VALUES (v_id, 'Endwise', 'endwise', 'platform', NULL, now());
  END IF;

  INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Mikkis', 'mikkis@twofold.no', true, now(), now()
   WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE email = 'mikkis@twofold.no');

  UPDATE "user"
     SET email_verified = true,
         name = CASE WHEN name IS NULL OR name = '' THEN 'Mikkis' ELSE name END,
         updated_at = now()
   WHERE email = 'mikkis@twofold.no';

  SELECT id INTO v_user FROM "user" WHERE email = 'mikkis@twofold.no' LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM member
     WHERE organization_id = v_org AND user_id = v_user
  ) THEN
    INSERT INTO member (id, organization_id, user_id, role, created_at)
    VALUES (gen_random_uuid()::text, v_org, v_user, 'endwise_admin', now());
  ELSE
    UPDATE member
       SET role = 'endwise_admin'
     WHERE organization_id = v_org AND user_id = v_user;
  END IF;

  FOR r IN
    SELECT id FROM tenants
     WHERE slug IS DISTINCT FROM 'endwise'
       AND kind IS DISTINCT FROM 'platform'
  LOOP
    PERFORM slett_forhandler(r.id);
  END LOOP;
END $$;
