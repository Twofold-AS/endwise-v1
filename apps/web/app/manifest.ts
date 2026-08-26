import type { MetadataRoute } from 'next';

/**
 * Web App Manifest for mekaniker-PWA-en. Gjør Endwise installerbar på
 * mobil (Add to Home Screen), åpner i standalone (uten nettleser-chrome), starter
 * på «Min dag». Merkevare: lyst tema, svart aksent `#111111`.
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
    background_color: '#ffffff',
    theme_color: '#111111',
    lang: 'nb',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
