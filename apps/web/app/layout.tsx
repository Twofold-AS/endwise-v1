import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { TEMA_SKRIPT } from './(app)/_lib/tema';
import { Providers } from './providers';
import './globals.css';

/*
 * Synara-typografi: Geist + Geist Mono (next/font, selvhostet).
 * Inter og JetBrains Mono lastes som fallback-variabler — ikke primær UI-font.
 */
const geistSans = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

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
    { media: '(prefers-color-scheme: light)', color: '#f5f4f2' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
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
    <html
      lang="nb"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${mono.variable}`}
    >
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
