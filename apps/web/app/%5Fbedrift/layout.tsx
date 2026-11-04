import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Endwise',
  robots: { index: false, follow: false },
};

export default function BedriftLayout({ children }: { children: ReactNode }) {
  return children;
}
