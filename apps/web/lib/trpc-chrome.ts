/**
 * tRPC-stier sidebaren / chrome faktisk trenger på første maling.
 * Alt annet (lager, kunder, jobber, innboks-liste, stream) hører til
 * sidene og skal ikke dele HTTP-batch med `session.me`.
 *
 * `session.me` går på egen `httpLink` (ikke i chrome-batchen): nav venter
 * bare på den, ikke på billing/helpdesk. httpBatchLink er all-or-nothing.
 */
export const SESSION_ME_PATH = 'session.me';

export const CHROME_TRPC_PATHS = [
  SESSION_ME_PATH,
  'forhandler.kort',
  'helpdesk.ulesteAntall',
  'billing.subscription',
] as const;

export type ChromeTrpcPath = (typeof CHROME_TRPC_PATHS)[number];

export function erSessionMePath(path: string): boolean {
  return path === SESSION_ME_PATH;
}

export function erChromeTrpcPath(path: string): boolean {
  return (CHROME_TRPC_PATHS as readonly string[]).includes(path);
}
