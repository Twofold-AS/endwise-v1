import { framer } from 'framer-plugin';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

/**
 * Plugin-inngang. Åpner plugin-panelet i Framer-editoren.
 */
framer.showUI({ position: 'top right', width: 360, height: 640, resizable: true });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
