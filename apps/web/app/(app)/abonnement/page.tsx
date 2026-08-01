'use client';

import { Badge, Check, CreditCard } from '@endwise/ui';
import { BevelButton, CardShell, NewBadge } from '../_shell/cards';
import { MOCK_SUB, PLANS_UI } from './_data';

/**
 * Forhandler → Abonnement (selvbetjent). Forhandler-admin ser planer, velger/
 * oppgraderer, administrerer i Stripe Customer Portal, ser status. Planen gir
 * entitlements (F5-09 → F0-04) som styrer integrasjonene (se /integrasjoner).
 *
 * MOCK: knappene wires til `trpc.billing.checkout` / `.portal` når web-klienten
 * er på plass. Vi utfører ALDRI trekk selv — forhandleren fullfører hos Stripe.
 */
export default function AbonnementPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-8 py-7">
      <div className="flex items-center gap-2">
        <CreditCard size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Abonnement</h1>
        <NewBadge />
        <span className="ml-auto text-fg-faint text-xs">
          Mock til Stripe er koblet (F5-09) · trekkes ALDRI av oss
        </span>
      </div>

      {/* Gjeldende status */}
      <CardShell>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-[#0e0e0e] px-4 py-3 text-sm">
          <span className="text-fg-muted">
            Nåværende plan:{' '}
            <span className="font-semibold text-fg capitalize">{MOCK_SUB.planKey}</span>
          </span>
          <span className="text-fg-muted">
            Status: <span className="font-medium text-success">{MOCK_SUB.status}</span>
          </span>
          <span className="text-fg-muted">
            Neste trekk: <span className="text-fg">{MOCK_SUB.currentPeriodEnd}</span>
          </span>
          <div className="ml-auto">
            <BevelButton>Administrer i Stripe</BevelButton>
          </div>
        </div>
      </CardShell>

      {/* Planer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS_UI.map((plan) => {
          const current = plan.key === MOCK_SUB.planKey;
          return (
            <CardShell key={plan.key}>
              <div className="flex flex-1 flex-col gap-3 rounded-lg bg-[#0e0e0e] p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-base text-fg capitalize">{plan.name}</span>
                  {current && (
                    <Badge
                      variant="outline"
                      className="border-success/25 bg-success/12 text-[10px] text-success"
                    >
                      Aktiv
                    </Badge>
                  )}
                </div>
                <div className="font-semibold text-fg text-xl tabular-nums">
                  {plan.priceMonthly}
                </div>
                <ul className="flex flex-col gap-1.5 text-fg-muted text-xs">
                  {plan.modules.map((m) => (
                    <li key={m} className="flex items-center gap-1.5">
                      <Check size={13} className="shrink-0 text-success" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-1.5 pt-2 pb-1">
                {current ? (
                  <span className="inline-flex rounded-lg border border-border px-3 py-1.5 text-fg-faint text-xs">
                    Nåværende plan
                  </span>
                ) : (
                  <BevelButton className="w-full">Velg {plan.name}</BevelButton>
                )}
              </div>
            </CardShell>
          );
        })}
      </div>

      <p className="text-fg-faint text-xs">
        Fakturaer og betalingsmetode administreres i Stripe Customer Portal. Recurring (månedlig)
        abonnement; du fullfører selv checkout — vi trekker aldri på dine vegne.
      </p>
    </div>
  );
}
