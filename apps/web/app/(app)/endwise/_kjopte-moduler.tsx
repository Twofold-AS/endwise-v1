'use client';

import { Badge, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

type Rad = RouterOutput['tenants']['listModules'][number];
type Katalog = RouterOutput['tenants']['addonKatalog'];

/**
 * F1-07 / F0-04 / F5-26 — `tenant_modules` per forhandler.
 * Endwise-admin setter pakke (fast) og valgfrie tillegg. Stripe skriver ved kjøp.
 * `moduleProcedure` håndhever. `dealer_admin` får FORBIDDEN på skriving.
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
  const utils = trpc.useUtils();
  const katalog = trpc.tenants.addonKatalog.useQuery();
  const sett = trpc.tenants.setModules.useMutation({
    onSuccess: () => {
      void utils.tenants.listModules.invalidate();
    },
  });
  const [apen, setApen] = useState<string | null>(null);

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
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border">
        {rader.map((t, i) => {
          const pa = t.modules.filter((m) => m.enabled && m.source !== 'optional');
          const optional = t.modules
            .filter((m) => m.source === 'optional' || m.source === 'dealer')
            .map((m) => m.moduleKey);
          const vis = apen === t.id;
          return (
            <div
              key={t.id}
              className={`flex flex-col gap-2 bg-bg px-4 py-3 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">{t.name}</span>
                  <span className="truncate text-[12px] text-fg-muted">
                    {t.slug}
                    {t.kind === 'demo' ? ' · demo' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pa.length === 0 ? (
                    <span className="text-[12px] text-fg-muted">Ingen tillegg</span>
                  ) : (
                    pa.map((m) => (
                      <Badge key={m.moduleKey} variant="secondary">
                        {m.moduleKey}
                      </Badge>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setApen(vis ? null : t.id)}
                  className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  {vis ? 'Lukk' : 'Endre'}
                </button>
              </div>
              {vis ? (
                <ModulAvkrysning
                  key={`${t.id}:${pa.map((m) => m.moduleKey).join(',')}:${optional.join(',')}`}
                  katalog={katalog.data ?? []}
                  included={pa.map((m) => m.moduleKey)}
                  optional={optional}
                  pending={sett.isPending}
                  onLagre={(modules, opt) =>
                    sett.mutate({ tenantId: t.id, modules, optional: opt })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {sett.isError ? <p className="text-body text-danger">{sett.error.message}</p> : null}
    </div>
  );
}

function ModulAvkrysning({
  katalog,
  included,
  optional,
  pending,
  onLagre,
}: {
  katalog: Katalog;
  included: string[];
  optional: string[];
  pending: boolean;
  onLagre: (modules: string[], optional: string[]) => void;
}) {
  const [fast, setFast] = useState(() => new Set(included));
  const [valg, setValg] = useState(() => new Set(optional));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-fg-muted">I pakken</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {katalog.map((m) => (
          <label key={`inc-${m.key}`} className="flex items-center gap-2 text-body text-fg">
            <input
              type="checkbox"
              checked={fast.has(m.key)}
              onChange={() => {
                setFast((forrige) => {
                  const neste = new Set(forrige);
                  if (neste.has(m.key)) neste.delete(m.key);
                  else neste.add(m.key);
                  return neste;
                });
              }}
              className="size-4 accent-[#111]"
            />
            {m.label}
          </label>
        ))}
      </div>
      <p className="text-[12px] text-fg-muted">Kan velges i veiviseren</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {katalog.map((m) => (
          <label key={`opt-${m.key}`} className="flex items-center gap-2 text-body text-fg">
            <input
              type="checkbox"
              checked={valg.has(m.key)}
              disabled={fast.has(m.key)}
              onChange={() => {
                setValg((forrige) => {
                  const neste = new Set(forrige);
                  if (neste.has(m.key)) neste.delete(m.key);
                  else neste.add(m.key);
                  return neste;
                });
              }}
              className="size-4 accent-[#111]"
            />
            {m.label}
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <StatefulButton
          type="button"
          disabled={pending}
          state={pending ? 'loading' : 'idle'}
          loadingText="Lagrer…"
          onClick={() => onLagre([...fast], [...valg].filter((k) => !fast.has(k)))}
        >
          Lagre pakke
        </StatefulButton>
      </div>
    </div>
  );
}
