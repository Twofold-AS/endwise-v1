/*
 * SELECT-only RLS for Endwise-admin på forhandlerEndwise-tråder.
 * `withPlatformAdmin` satte tidligere bare `tenants` synlig. Support-tråder
 * bor på forhandler-tenanten (`thread_kind = dealer_admin`). Denne policyen
 * er det smaleste hullet: kun SELECT, kun den kind-en. listThreads for
 * dealer_staff / dealer_admin er urørt (fortsatt tenant_isolation).
 */
CREATE POLICY "threads_platform_admin_support_read" ON "threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND "kind" = 'dealer_admin');-- > statement-breakpoint
CREATE POLICY "thread_participants_platform_admin_support_read" ON "thread_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin'
));-- > statement-breakpoint
CREATE POLICY "messages_platform_admin_support_read" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin'
));
