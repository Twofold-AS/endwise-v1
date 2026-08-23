'use client';

import { Badge } from '@endwise/ui';
import type { RouterOutput } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

type Rad = RouterOutput['tenants']['listModules'][number];

/**
 * F1-07 / F0-04 — read-only visning av `tenant_modules`.
 * Ingen brytere. Ingen mutasjon. Stripe (F5-32) er skrivestien.
 */
export function KjopteModulerTabell({
  rader,
  laster,
  feil,
}: {
  rader: Rad[] | undefined;
  laster: boolean;
  feil?: string;
}) {
  if (feil) {
    return (
      <CardShell className="p-6">
        <p className="text-body text-danger">{feil}</p>
      </CardShell>
    );
  }
  if (laster) {
    return <p className="py-6 text-center text-body text-fg-muted">Laster …</p>;
  }
  if (!rader || rader.length === 0) {
    return (
      <CardShell className="p-8 text-center">
        <p className="text-label text-fg">Ingen forhandlere</p>
        <p className="mt-1 text-[12px] text-fg-muted">Opprett en under Forhandlere først.</p>
      </CardShell>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {rader.map((t, i) => {
        const pa = t.modules.filter((m) => m.enabled);
        return (
          <div
            key={t.id}
            className={`flex flex-col gap-1.5 bg-bg px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${
              i > 0 ? 'border-border border-t' : ''
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label text-fg">{t.name}</span>
              <span className="truncate text-[12px] text-fg-muted">
                {t.slug}
                {t.kind === 'demo' ? ' · demo' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pa.length === 0 ? (
                <span className="text-[12px] text-fg-muted">Ingen kjøpte tillegg</span>
              ) : (
                pa.map((m) => (
                  <Badge key={m.moduleKey} variant="secondary">
                    {m.moduleKey}
                  </Badge>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
