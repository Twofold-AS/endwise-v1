'use client';

import { Button, Moon, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { lesTema, settTema, type Tema } from '../_lib/tema';

/**
 * Tema-toggle. LYST er standard (satt på <html data-theme="light"> i
 * app/layout.tsx); denne flipper mellom "light" og "dark".
 *
 * ⚠️ **RETTET 20.08.2026.** Denne skrev tidligere rett på
 * `document.documentElement.dataset.theme` og lagret ingenting — så mørkt tema
 * forsvant ved hver refresh. Lagring og bytte bor nå i `_lib/tema.ts`, og
 * oppstart i et inline-skript i layouten. Se den fila for hele historien.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Tema>('light');

  // Les faktisk tilstand etter mount (unngår hydrerings-mismatch).
  useEffect(() => {
    setTheme(lesTema());
  }, []);

  function toggle() {
    const next: Tema = theme === 'dark' ? 'light' : 'dark';
    settTema(next);
    setTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
      title={theme === 'dark' ? 'Lyst tema' : 'Mørkt tema'}
      className="rounded-lg border border-border bg-surface/40 text-fg-muted hover:text-fg"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
