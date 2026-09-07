'use client';

import { Moon, Sun } from '@endwise/ui';
import { useTema } from './tema-provider';

export function TemaToggle({
  className = '',
  storrelse = 16,
}: {
  className?: string;
  storrelse?: number;
}) {
  const { los, veksle } = useTema();
  const mork = los === 'dark';

  return (
    <button
      type="button"
      data-tema-toggle
      onClick={veksle}
      aria-label={mork ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
      title={mork ? 'Lyst tema' : 'Mørkt tema'}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
    >
      {mork ? (
        <Sun size={storrelse} strokeWidth={1.6} />
      ) : (
        <Moon size={storrelse} strokeWidth={1.6} />
      )}
    </button>
  );
}
