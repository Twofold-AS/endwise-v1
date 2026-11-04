/*
 * 0058 — Rett platform-admin etter 0057.
 * 0057 kan allerede ha kjørt med mikael_rk@hotmail.com. Denne tar
 * endwise_admin fra den e-posten og seeder mikkis@twofold.no i stedet.
 * Idempotent via drizzle-journal.
 */
DO $$
DECLARE
  v_org text;
  v_user text;
BEGIN
  SELECT id INTO v_org FROM organization WHERE slug = 'endwise' LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION '0058: Endwise-org mangler';
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

  DELETE FROM member
   WHERE role = 'endwise_admin'
     AND user_id IN (SELECT id FROM "user" WHERE email = 'mikael_rk@hotmail.com');
END $$;
