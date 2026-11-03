import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Layout-guard: (app) på forhandlervert krever Bedrift.
 * Proxyen rewriter allerede; dette er forsvar i dybden ved klientnavigasjon.
 */
export default async function AppMal({ children }: { children: ReactNode }) {
  const h = await headers();
  if (h.get('x-endwise-sone') === 'forhandler' && h.get('x-endwise-kontekst') !== 'bedrift') {
    redirect('/logg-inn');
  }
  return children;
}
