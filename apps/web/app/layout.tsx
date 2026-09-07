import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { TEMA_SKRIPT } from './(app)/_lib/tema';
import { Providers } from './providers';
import './globals.css';

/*
 * Mobbin-typografi: Inter variabel (Saans 652/456/300 → 650/450/300).
 * Fallback-stabelen bor i widget-tokens. Ikke Synara-font.
 */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Endwise — Verkstedet, samlet.',
  description: 'Booking, innboks og jobber i ett system for MC-, båt- og ATV-verkstedet.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Endwise' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141414' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
  // Pinch-zoom beholdes. Ingen zoom-lås i viewport.
};

/**
 * Dual theme: FOUC-skript setter `.dark` + `data-theme` før paint.
 * Uten lagret valg følger vi `prefers-color-scheme`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* FOUC: setter .dark / data-theme før paint. Konstant, ikke brukerinput. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: statisk tema-skript */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_SKRIPT }} />
      </head>
      <body className="bg-bg font-sans text-body text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
