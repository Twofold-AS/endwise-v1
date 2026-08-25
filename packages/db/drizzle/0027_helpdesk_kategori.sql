/*
 * 0027 — F5-51: fast kategori på hjelpeartikler.
 *
 * Globale tabeller uten RLS (se schema/helpdesk.ts). Kolonnen er text +
 * applikasjonsenum, ikke pg ENUM — samme mønster som andre faste lister
 * i repoet. Eksisterende rader får brukerguide (veiledningene som allerede
 * ligger der). Etter merge: pnpm db:setup (migrate + grants).
 */
ALTER TABLE "helpdesk_articles" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'brukerguide' NOT NULL;
