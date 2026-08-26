import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite-config for Framer-plugin-skallet.
 * Viktig (bug-fiks): `framer-plugin@3.x` bruker top-level await. Vites default
 * `build.target` er `es2020`, som ikke støtter tla → «Top-level await is not
 * available in the configured target environment». Vi løfter derfor targeten til
 * `es2022` (første es-versjon med tla) på alle tre stedene esbuild/Vite bruker:
 * build.target (produksjonsbygg / rollup+esbuild)
 * esbuild.target (dev-transform)
 * optimizeDeps (dep-prebundling, der framer-plugin faktisk pakkes)
 * Framer-editoren kjører moderne Chromium, så es2022 er trygt.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  esbuild: {
    target: 'es2022',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
});
