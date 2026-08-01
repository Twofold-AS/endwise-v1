import type { ReactNode } from 'react';

/**
 * Split-card — kort-mønsteret fra TheFold: en tittel-linje øverst (venstre:
 * tittel + valgfri undertekst, høyre: valgfri handling) og et innholdsfelt
 * under. Bygget på token-laget (bg-card / border-border), ingen hardkodet farge.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>}
            {subtitle && <p className="truncate text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName ?? 'p-4'}>{children}</div>
    </section>
  );
}
