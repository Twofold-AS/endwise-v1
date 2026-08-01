'use client';

import { Blocks, Lock } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { CardShell, NewBadge } from '../_shell/cards';
import { INTEGRATIONS_UI } from '../abonnement/_data';

/**
 * Integrasjoner (forhandler-selvbetjent). Forhandleren skrur egne integrasjoner
 * av/på — men KUN de planen gir tilgang til (entitlements, F5-09 → F0-04). Det
 * som ligger bak en høyere plan vises som LÅST med lenke til Abonnement.
 *
 * MOCK: toggelen wires til `trpc.billing.setIntegration` (adminProcedure + RLS)
 * når web-klienten er på plass. Rollestyrt: kun forhandler-admin kan endre.
 */
export default function IntegrasjonerPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div className="flex items-center gap-2">
        <Blocks size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Integrasjoner</h1>
        <NewBadge />
        <span className="ml-auto text-fg-faint text-xs">
          Selvbetjent · gated av abonnementsplan (F5-09)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS_UI.map((i) => (
          <IntegrationCard key={i.key} integration={i} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: (typeof INTEGRATIONS_UI)[number] }) {
  const [enabled, setEnabled] = useState(integration.enabled);
  const locked = !integration.entitled;

  return (
    <CardShell>
      <div className="flex flex-1 flex-col gap-2 rounded-lg bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[13px] text-fg">{integration.name}</span>
          {locked && (
            <span className="inline-flex items-center gap-1 text-fg-faint text-[11px]">
              <Lock size={12} /> Krever {integration.minPlan}
            </span>
          )}
        </div>
        <p className="text-[12px] text-fg-faint leading-snug">{integration.desc}</p>
      </div>

      <div className="flex items-center justify-between px-1.5 pt-2 pb-1">
        {locked ? (
          <Link
            href={'/abonnement' as Route}
            className="text-[12px] text-primary underline-offset-2 hover:underline"
          >
            Oppgrader plan
          </Link>
        ) : (
          <>
            <span className="text-[12px] text-fg-muted">{enabled ? 'På' : 'Av'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${integration.name} ${enabled ? 'på' : 'av'}`}
              onClick={() => setEnabled((v) => !v)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                enabled ? 'bg-primary' : 'bg-surface-2'
              }`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </>
        )}
      </div>
    </CardShell>
  );
}
