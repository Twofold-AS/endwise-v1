/*
 * 0032 — mechanics-rad for ansatte med job_function=mekaniker uten rad.
 * team.setFunction skrev bare member_profiles. De som ble flippet
 * selger/support → mekaniker (eller invitert som ikke-mekaniker og
 * deretter satt) har landing /min-dag men ingen tildelbar rad.
 * Jobbpicker bruker mechanics.list + match (active=true), ikke team.list.
 * Idempotent: NOT EXISTS på mechanics.user_id + tenant_id.
 * Alle tenants likt — ingen hardkodet forhandler.
 * organization har ingen RLS (ADR-002), så loopen finner tenant-ider.
 * Deretter settes app.tenant_id lokalt, slik at FORCE RLS på
 * member_profiles og mechanics slipper gjennom akkurat den tenanten.
 */
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT id FROM organization
  LOOP
    IF t IS NULL OR t !~ '^[0-9a-fA-F-]{36}$' THEN
      CONTINUE;
    END IF;
    PERFORM set_config('app.tenant_id', t, true);
    INSERT INTO "mechanics" ("tenant_id", "user_id", "name", "capacity", "active")
    SELECT
      mp."tenant_id",
      mp."user_id",
      COALESCE(NULLIF(u."name", ''), 'Mekaniker'),
      1,
      true
    FROM "member_profiles" mp
    INNER JOIN "member" m
      ON m."organization_id" = mp."tenant_id"::text
     AND m."user_id" = mp."user_id"
    INNER JOIN "user" u ON u."id" = mp."user_id"
    WHERE mp."tenant_id" = t::uuid
      AND mp."job_function" = 'mekaniker'
      AND NOT EXISTS (
        SELECT 1 FROM "mechanics" mk
        WHERE mk."tenant_id" = mp."tenant_id"
          AND mk."user_id" = mp."user_id"
      );
  END LOOP;
END $$;
