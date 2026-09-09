'use client';

import type { ReactNode } from 'react';

/**
 * Organisasjon › Oversikt — samme rad + Endre som Innstillinger › Konto.
 */
export function OrgRad({
  label,
  verdi,
  apen,
  onEndre,
  siste,
  lesing,
  children,
}: {
  label: string;
  verdi: string;
  apen?: boolean;
  onEndre?: () => void;
  siste?: boolean;
  lesing?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={siste ? '' : 'border-border border-b'} data-org-rad={label}>
      <div className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">{label}</p>
          <p className="mt-1 truncate text-[13px] text-fg-muted">{verdi || '—'}</p>
        </div>
        {lesing || !onEndre ? null : (
          <button
            type="button"
            data-org-endre={label}
            onClick={onEndre}
            className="shrink-0 pt-0.5 text-label font-[650] text-fg"
          >
            {apen ? 'Lukk' : 'Endre'}
          </button>
        )}
      </div>
      {apen && children ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}
