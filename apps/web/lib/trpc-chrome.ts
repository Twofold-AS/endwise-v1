/**
 * tRPC-stier sidebaren / chrome faktisk trenger på første maling.
 * Alt annet (lager, kunder, jobber, innboks-liste, stream) hører til
 * sidene og skal ikke dele HTTP-batch med `session.me`.
 */
export const CHROME_TRPC_PATHS = [
  'session.me',
  'forhandler.kort',
  'helpdesk.ulesteAntall',
  'billing.subscription',
] as const;

export type ChromeTrpcPath = (typeof CHROME_TRPC_PATHS)[number];

export function erChromeTrpcPath(path: string): boolean {
  return (CHROME_TRPC_PATHS as readonly string[]).includes(path);
}
