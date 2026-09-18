import type { ReactNode } from 'react';

/** Claude pageSub under eksisterende Endwise-tittel — ikke i top-bar 1+2. */
export function PageSub({ children }: { children: ReactNode }) {
  return (
    <p data-page-sub className="text-body text-fg-muted">
      {children}
    </p>
  );
}
