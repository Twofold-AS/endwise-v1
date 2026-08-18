'use client';

import { Button, Moon, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';

/**
 * Tema-toggle. LYST er standard (satt på <html data-theme="light"> i
 * app/layout.tsx); denne flipper mellom "light" og "dark" ved å skrive
 * data-theme på <html>. Ingen egen fjær/animasjon — ren tilstandsbytte.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

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
