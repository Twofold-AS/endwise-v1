/**
 * Rewrites som fortsatt går ut av Next-appen.
 * Auth, tRPC, chat, invitasjoner, widget, health, cron og Stripe lever nå
 * som route handlers i `apps/web`. De skal ikke proxes til
 * `API_INTERNAL_URL` (localhost:3001). Bare SSE-strømmen (`apps/stream`)
 * blir stående på en intern URL — den hører ikke hjemme på Vercel serverless.
 */
export function streamRewrites(env: Record<string, string | undefined> = process.env) {
  const stream = env.STREAM_INTERNAL_URL ?? 'http://localhost:3002';
  return [{ source: '/stream/:path*', destination: `${stream}/:path*` }] as const;
}
