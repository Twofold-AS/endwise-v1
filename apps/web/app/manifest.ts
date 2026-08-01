import type { MetadataRoute } from 'next';

/**
 * F7-01 — Web App Manifest for mekaniker-PWA-en. Gjør Endwise installerbar på
 * mobil (Add to Home Screen), åpner i standalone (uten nettleser-chrome), starter
 * på «Min dag». Merkevare: grønn `#1ED27D`, mørkt tema.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Endwise Verksted',
    short_name: 'Endwise',
    description: 'Mekanikerens arbeidsdag — dagens jobber, status og kompetanse.',
    // Mekanikeren låses til /min-dag; PWA-en åpner rett i køen.
    start_url: '/min-dag',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#151515',
    theme_color: '#1ED27D',
    lang: 'nb',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
