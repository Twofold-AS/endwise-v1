import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * F27 / white label F8a — token skal ikke lekke via Referer.
 * GET på lenken endrer ingenting; denne headeren gjelder hele flaten.
 */
export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false, nocache: true },
};

export default function InvitasjonLayout({ children }: { children: ReactNode }) {
  return children;
}
