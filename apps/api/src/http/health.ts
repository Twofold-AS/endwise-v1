/**
 * `/health` som Web Response. Ingen DB, ingen env.
 */
export function handleHealth(): Response {
  return Response.json({ ok: true, service: 'api', at: new Date().toISOString() });
}
