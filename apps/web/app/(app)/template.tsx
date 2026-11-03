import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Layout-guard: (app) på forhandlervert krever Bedrift.
 * Proxyen rewriter allerede; dette er forsvar i dybden ved klientnavigasjon.
 * `/logg-inn` er rewrite-mål (`/_kunde/[slug]/logg-inn`), ikke egen rot-rute,
 * derfor `as Route` — samme mønster som øvrige redirect-er i (app).
 */
export default async function AppMal({ children }: { children: ReactNode }) {
  const h = await headers();
  if (h.get('x-endwise-sone') === 'forhandler' && h.get('x-endwise-kontekst') !== 'bedrift') {
    redirect('/logg-inn' as Route);
  }
  return children;
}
