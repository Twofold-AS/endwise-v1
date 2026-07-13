import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Endwise',
  description: 'Endwise — booking og verkstedstyring',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" data-theme="light">
      <body className="bg-bg text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
