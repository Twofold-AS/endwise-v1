/**
 * F1-26 / CWE-215 — seed-/demo-hint på /signin.
 * Alltid av: preview, prod og lokal. Ingen `pnpm db:seed`, ingen demo-konto.
 */
export function visDemoHint(_env?: { NODE_ENV?: string; VERCEL_ENV?: string }): boolean {
  return false;
}
