/**
 * F1-26 / CWE-215 — skal seed-/demo-hintet på /signin vises?
 * Produksjon (`VERCEL_ENV=production` eller `NODE_ENV=production` uten
 * preview) skal aldri nevne `pnpm db:seed`, demo-kontoer eller passord.
 * Preview og lokal dev kan vise hintet. Sjekken er env, ikke en kommentar.
 */
export function visDemoHint(env: { NODE_ENV?: string; VERCEL_ENV?: string }): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  if (env.NODE_ENV === 'production' && env.VERCEL_ENV !== 'preview') return false;
  return true;
}
