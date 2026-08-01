'use client';

import { Button, Moon, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';

/**
 * Tema-toggle. Mørkt er standard (satt på <html data-theme="dark"> i
 * app/layout.tsx); denne flipper mellom "dark" og "light" ved å skrive
 * data-theme på <html>. Ingen egen fjær/animasjon — ren tilstandsbytte.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Les faktisk tilstand etter mount (unngår hydrerings-mismatch).
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
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
