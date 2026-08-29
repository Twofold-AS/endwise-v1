import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

/*
 * Typografi — inter (eierens designprinsipper). Erstatter Google
 * Sans Flex. Inter er sil Open Font License, variabel (hele wght-aksen), og
 * finnes i next/font-katalogen med ekte fallback-metrics — derfor trenger den
 * ikke `adjustFontFallback: false` slik forgjengeren gjorde.
 * Selvhostet ved build: ingen fout, ingen layout-shift, ingen runtime-kall til
 * Google. Mono: JetBrains Mono (ofl) — beholdt for tall og tabeller.
 * Skalaen (16/20 titler, 13/16 labels, 14 brødtekst) bor i
 * `packages/ui/src/theme.css` som `text-title`/`text-label`/`text-body` — ikke
 * her, og ikke som løse utilities i komponentene.
 */
const sans = Inter({
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
  title: 'Endwise',
  description: 'Endwise - booking og verkstedstyring',
  // Ios «Legg til på Hjem-skjerm» (Apple bruker ikke manifest fullt ut).
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Endwise' },
};

// PWA-tema (Next 14+: themeColor hører til viewport, ikke metadata).
export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  // Chrome/iOS: uten cover er env(safe-area-inset-*) 0 og 100vh går under UI.
  viewportFit: 'cover',
};

/*
 * Lyst tema er standard (eierens designprinsipper, — snudd fra mørkt
 * default som gjaldt fra 15.07). Mørkt ligger klart som `data-theme="dark"` og
 * nås via <ThemeToggle>; begge palettene bor i widget-tokens.
 */

/**
 * Temaet MÅ settes før første maling — derfor et inline-skript og ikke en
 * React-effekt.
 * Dette er fiksen på en ekte bug: mørkt tema overlevde ikke en
 * refresh. `data-theme="light"` under er serverens gjetning, og den er riktig
 * for en ny bruker — men bryterne lagret ingenting, så hver sidelast satte alle
 * tilbake til lyst.
 * En `useEffect` ville rettet attributtet, men først etter at siden var malt:
 * brukeren ville sett et hvitt glimt før det ble mørkt igjen, på hver eneste
 * navigasjon. Et blokkerende skript i `<head>` kjører før noe tegnes.
 * `try/catch` fordi localStorage kaster i privat modus i enkelte nettlesere
 * og et tema som kaster ville tatt ned hele sida før den rakk å vises.
 * Nøkkelen er den samme som i `_lib/tema.ts`; endres den ett sted, må den
 * endres begge.
 */
const TEMA_SKRIPT = `try{var t=localStorage.getItem("endwise:tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" data-theme="light" className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/*
         * biome-ignore lint/security/noDangerouslySetInnerHtml: konstant streng,
         * ingen brukerdata — og den MÅ kjøre før maling, se kommentaren over.
         */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_SKRIPT }} />
      </head>
      <body className="bg-bg font-sans text-body text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
