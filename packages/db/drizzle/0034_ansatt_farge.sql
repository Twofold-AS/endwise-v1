/*
 * 0034 — ansattfarge som ColorId, ikke hue-grader.
 * `avatar_hue` blir leftover. Kilden til sannhet er `avatar_color`
 * (bloub-paletten). Eksisterende grader mappes til nærmeste gamle velger-stopp.
 */
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "avatar_color" text;-- > statement-breakpoint
UPDATE "user_preferences"
SET "avatar_color" = CASE
  WHEN "avatar_color" IS NOT NULL THEN "avatar_color"
  WHEN "avatar_hue" IS NULL THEN NULL
  WHEN abs("avatar_hue" - 20) <= 20 OR "avatar_hue" >= 340 THEN 'rouge'
  WHEN abs("avatar_hue" - 60) <= 25 THEN 'orange'
  WHEN abs("avatar_hue" - 110) <= 25 THEN 'ambre'
  WHEN abs("avatar_hue" - 150) <= 22 THEN 'vert'
  WHEN abs("avatar_hue" - 195) <= 27 THEN 'turquoise'
  WHEN abs("avatar_hue" - 250) <= 20 THEN 'bleu'
  WHEN abs("avatar_hue" - 270) <= 15 THEN 'violet'
  ELSE 'rose'
END
WHERE "avatar_color" IS NULL AND "avatar_hue" IS NOT NULL;-- > statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_avatar_color_check";-- > statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_avatar_color_check"
  CHECK ("avatar_color" IS NULL OR "avatar_color" IN (
    'encre','brun','rouge','orange','ambre','vert','turquoise','bleu','violet','rose','gris','creme'
  ));
