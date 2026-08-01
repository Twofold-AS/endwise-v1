import { framer } from 'framer-plugin';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

/**
 * F4-01 — Plugin-inngang. Åpner plugin-panelet i Framer-editoren.
 */
framer.showUI({ position: 'top right', width: 320, height: 360 });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
