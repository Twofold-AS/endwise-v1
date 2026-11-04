import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Layout-guard: (app) på forhandlervert krever innlogging.
 * Bedrift-kontekst håndheves i API (`krevBedriftFlate`) og på /velg.
 * Preview: `?kontekst=bedrift` slipper gjennom uten sesjon (ikke prod).
 * `/logg-inn` er rewrite-mål, derfor `as Route`.
 */
export default async function AppMal({ children }: { children: ReactNode }) {
  const h = await headers();
  const sone = h.get('x-endwise-sone');
  if (sone === 'app') {
    const cookie = h.get('cookie') ?? '';
    if (!/(?:__Host-|__Secure-)?endwise\.session_token=/.test(cookie)) {
      redirect('/logg-inn' as Route);
    }
    return children;
  }
  if (sone !== 'forhandler') return children;
  redirect('/' as Route);
}
