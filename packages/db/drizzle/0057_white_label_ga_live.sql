/*
 * 0057 — White label gå live (Mikael 04.11.2026).
 * 1) Sikre Endwise-plattformtenanten.
 * 2) Seed mikael_rk@hotmail.com som endwise_admin.
 * 3) Slett eksisterende forhandlere (godkjent fresh start).
 * Idempotent via drizzle-journal. Kjører som eier ved db:migrate.
 */
DO $$
DECLARE
  v_org text;
  v_id uuid;
  v_user text;
  r record;
BEGIN
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
    UPDATE tenants
       SET kind = 'platform',
           plan = NULL,
           name = 'Endwise',
           onboarding_completed_at = COALESCE(onboarding_completed_at, now())
     WHERE slug = 'endwise';
    SELECT id INTO v_id FROM tenants WHERE slug = 'endwise' LIMIT 1;
    SELECT id INTO v_org FROM organization WHERE slug = 'endwise' LIMIT 1;
  ELSE
    INSERT INTO tenants (id, name, slug, kind, plan, onboarding_completed_at)
    VALUES (v_id, 'Endwise', 'endwise', 'platform', NULL, now());
  END IF;

  INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Mikael', 'mikael_rk@hotmail.com', true, now(), now()
   WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE email = 'mikael_rk@hotmail.com');

  UPDATE "user"
     SET email_verified = true,
         name = CASE WHEN name IS NULL OR name = '' THEN 'Mikael' ELSE name END,
         updated_at = now()
   WHERE email = 'mikael_rk@hotmail.com';

  SELECT id INTO v_user FROM "user" WHERE email = 'mikael_rk@hotmail.com' LIMIT 1;

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

  PERFORM set_config('app.platform_admin', 'on', true);
  FOR r IN
    SELECT id FROM tenants
     WHERE slug IS DISTINCT FROM 'endwise'
       AND kind IS DISTINCT FROM 'platform'
  LOOP
    PERFORM slett_forhandler(r.id);
  END LOOP;
END $$;
