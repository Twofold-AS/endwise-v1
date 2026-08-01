import type { Metadata, Viewport } from 'next';
import { Google_Sans_Flex, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

/*
 * Typografi. Brukeren ba om «Google Sans Flex». Lisens verifisert 15.07.2026 mot
 * kilden (Google Fonts metadata-endepunkt): "license": "ofl", "isOpenSource":
 * true. Det er altså SIL Open Font License — fritt embeddbar for kommersiell
 * tredjepartsbruk, i motsetning til den proprietære «Google Sans».
 *
 * Google Sans Flex er «neste generasjon av Googles merkevare-typesnitt» (variabel
 * font: akser for vekt, bredde, optisk størrelse, helning + runde terminaler).
 * Lastes via next/font/google (finnes i Next 16-katalogen) — selvhostet ved
 * build, ingen FOUT/layout-shift, ingen runtime-kall til Google.
 *
 * Variabel font: vi pinner ikke diskrete vekter — hele wght-aksen (1–1000) er
 * tilgjengelig, så typeskalaens 400/500/600/700 dekkes. Mono: JetBrains Mono (OFL).
 */
const sans = Google_Sans_Flex({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-google-sans-flex',
  display: 'swap',
  // Next klarer ikke regne ut fallback-metrics for denne (ny variabel merkevare-
  // font uten metrics i katalogen) → «Failed to find font override values».
  // Vi slår av auto-justeringen; --ew-font-sans har allerede en systemfallback.
  adjustFontFallback: false,
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Endwise',
  description: 'Endwise - booking og verkstedstyring',
  // F7-01 — iOS «Legg til på Hjem-skjerm» (Apple bruker ikke manifest fullt ut).
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Endwise' },
};

// F7-01 — PWA-tema (Next 14+: themeColor hører til viewport, ikke metadata).
export const viewport: Viewport = {
  themeColor: '#1ED27D',
  colorScheme: 'dark',
};

// Mørkt tema er standard (brukerbeslutning 2026-07-15). Lyst tema er en toggle
// via <ThemeToggle>, som flipper data-theme til "light" på <html>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" data-theme="dark" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-bg text-fg font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
