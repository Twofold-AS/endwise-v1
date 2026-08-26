'use client';

import {
  Badge,
  Check,
  CircleAlert,
  CreditCard,
  Lock,
  StatefulButton,
  TriangleAlert,
} from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';

/**
 * F5-09 / F5-32 — abonnement. Velg nivå + valgfrie tillegg → Stripe checkout.
 * Vi utfører aldri et trekk. Knappen henter en URL fra Stripe som
 * forhandleren selv fullfører der. Og entitlements flippes ikke av denne siden i
 * det hele tatt — kun av den signaturverifiserte webhooken.
 */
const kr = (ore: number) => (ore / 100).toLocaleString('nb-NO');

const STATUS_TEKST: Record<string, string> = {
  none: 'Ikke startet',
  active: 'Aktivt',
  trialing: 'Prøveperiode',
  past_due: 'Betaling mislyktes',
  canceled: 'Avsluttet',
};

export function AbonnementInnhold() {
  const { isAdmin } = useOrgRole();
  const utils = trpc.useUtils();

  const nivaaer = trpc.billing.plans.useQuery();
  const tillegg = trpc.billing.tillegg.useQuery();
  const abonnement = trpc.billing.subscription.useQuery();
  const naade = trpc.billing.naadeDager.useQuery();

  const [valgtNivaa, setValgtNivaa] = useState<string | null>(null);
  const [valgteTillegg, setValgteTillegg] = useState<string[]>([]);

  const checkout = trpc.billing.checkout.useMutation({
    onSuccess: (r) => {
      if (r.url) window.location.assign(r.url);
    },
  });
  const portal = trpc.billing.portal.useMutation({
    onSuccess: (r) => {
      if (r.url) window.location.assign(r.url);
    },
  });
  const mock = trpc.billing.applyPlanMock.useMutation({
    onSuccess: () => {
      void utils.billing.invalidate();
      void utils.session.invalidate();
    },
  });

  const aktivtNivaa = abonnement.data?.planKey ?? null;
  const status = abonnement.data?.status ?? 'none';
  const nivaa = valgtNivaa ?? aktivtNivaa ?? 'pro';

  const sum =
    (nivaaer.data?.find((n) => n.key === nivaa)?.priceMonthlyMinor ?? 0) +
    valgteTillegg.reduce(
      (s, k) => s + (tillegg.data?.find((t) => t.key === k)?.priceMonthlyMinor ?? 0),
      0,
    );

  function veksle(key: string) {
    setValgteTillegg((v) => (v.includes(key) ? v.filter((x) => x !== key) : [...v, key]));
  }

  return (
    <div className="flex flex-col gap-6">
      <CardShell className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-label text-fg">
            Status:{' '}
            <span className={status === 'past_due' ? 'text-danger' : 'text-fg-muted'}>
              {STATUS_TEKST[status] ?? status}
            </span>
          </span>
          {aktivtNivaa && (
            <span className="text-label text-fg">
              Nivå: <span className="text-fg-muted">{aktivtNivaa}</span>
            </span>
          )}
          {isAdmin && abonnement.data?.planKey && (
            <button
              type="button"
              onClick={() => portal.mutate({ returnUrl: window.location.href })}
              className="ml-auto h-control rounded-control border border-border px-3 text-label text-fg transition-colors hover:bg-surface-2"
            >
              Administrer hos Stripe
            </button>
          )}
        </div>

        {status === 'past_due' && (
          <p className="mt-3 flex items-start gap-2 text-body text-danger">
            <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            Betalingen gikk ikke gjennom. Verkstedet, Saker, Kunder og Lager fortsetter som normalt
            — tilleggene fryses først etter {naade.data ?? 14} dager.
          </p>
        )}
      </CardShell>

      <section className="flex flex-col gap-3">
        <h3 className="text-title text-fg">Velg nivå</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {nivaaer.data?.map((n) => {
            const valgt = nivaa === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => setValgtNivaa(n.key)}
                aria-pressed={valgt}
                className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors ${
                  valgt ? 'border-fg bg-sidebar-active' : 'border-border hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-title text-fg">{n.name}</span>
                  {aktivtNivaa === n.key && <Badge variant="secondary">Nåværende</Badge>}
                </div>
                <p className="font-medium text-[26px] text-fg leading-none tabular-nums">
                  {kr(n.priceMonthlyMinor)}
                  <span className="ml-1 font-normal text-[13px] text-fg-muted">kr/mnd</span>
                </p>
                <p className="text-[12px] text-fg-muted">{n.pitch}</p>
                <ul className="flex flex-col gap-1.5">
                  {n.hoydepunkter.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[12px] text-fg">
                      <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-success" />
                      {h}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-title text-fg">Valgfrie tillegg</h3>
          <p className="text-[12px] text-fg-muted">
            Kan legges på ethvert nivå. Hvert tillegg er sin egen linje på fakturaen.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {tillegg.data?.map((t) => {
            const valgt = valgteTillegg.includes(t.key);
            const laast = !t.kjopbar;
            return (
              <div
                key={t.key}
                className={`flex items-start gap-3 rounded-control border p-3 ${
                  valgt ? 'border-fg bg-sidebar-active' : 'border-border'
                } ${laast ? 'opacity-70' : ''}`}
              >
                {laast ? (
                  <Lock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
                ) : (
                  <input
                    type="checkbox"
                    id={`tillegg-${t.key}`}
                    checked={valgt}
                    onChange={() => veksle(t.key)}
                    className="mt-0.5 size-4 shrink-0 accent-black"
                  />
                )}
                <label
                  htmlFor={laast ? undefined : `tillegg-${t.key}`}
                  className={`flex min-w-0 flex-1 flex-col ${laast ? '' : 'cursor-pointer'}`}
                >
                  <span className="flex items-center gap-2 text-label text-fg">
                    {t.name}
                    {t.status === 'coming' && <Badge variant="secondary">Kommer</Badge>}
                    {t.status === 'blocked' && <Badge variant="secondary">På vent</Badge>}
                  </span>
                  <span className="text-[12px] text-fg-muted">{t.desc}</span>
                  {laast && t.merknad && (
                    <span className="mt-1 text-[11px] text-fg-muted italic">{t.merknad}</span>
                  )}
                </label>
                <span className="shrink-0 text-label text-fg tabular-nums">
                  {kr(t.priceMonthlyMinor)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <CardShell className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-label text-fg-muted">Totalt per måned, eks. mva</p>
            <p className="font-medium text-[28px] text-fg leading-none tabular-nums">
              {kr(sum)} <span className="font-normal text-[14px] text-fg-muted">kr</span>
            </p>
          </div>

          {isAdmin ? (
            <StatefulButton
              disabled={checkout.isPending}
              onClick={() =>
                checkout.mutate({
                  planKey: nivaa,
                  tillegg: valgteTillegg,
                  returnUrl: window.location.href,
                })
              }
              state={checkout.isPending ? 'loading' : checkout.isError ? 'error' : 'idle'}
              loadingText="Åpner Stripe…"
              errorText="Kunne ikke starte"
              icon={<CreditCard size={15} />}
            >
              Gå til betaling
            </StatefulButton>
          ) : (
            <p className="text-[12px] text-fg-muted">Kun forhandler-admin kan endre abonnement.</p>
          )}
        </div>

        {checkout.error && (
          <p className="mt-3 flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {checkout.error.message}
          </p>
        )}

        <p className="mt-3 text-[12px] text-fg-muted leading-relaxed">
          Betalingen fullføres hos Stripe — vi trekker aldri selv. Modulene skrus på når Stripe har
          bekreftet betalingen, ikke når du trykker her.
        </p>
      </CardShell>

      {process.env.NODE_ENV !== 'production' && isAdmin && (
        <CardShell className="p-4">
          <p className="text-label text-fg">Dev: simuler at webhooken har provisjonert</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Stripe-webhooken krever en offentlig URL. Denne knappen gjør det webhooken ville gjort,
            så onboarding kan testes uten tunnel. Finnes ikke i produksjon.
          </p>
          <div className="mt-3 flex justify-end">
            <StatefulButton
              disabled={mock.isPending}
              onClick={() => mock.mutate({ planKey: nivaa, tillegg: valgteTillegg })}
              state={
                mock.isPending
                  ? 'loading'
                  : mock.isError
                    ? 'error'
                    : mock.isSuccess
                      ? 'success'
                      : 'idle'
              }
              loadingText="Provisjonerer…"
              successText="Provisjonert"
              errorText="Feilet"
            >
              Aktiver {nivaa} lokalt
            </StatefulButton>
          </div>
          {mock.error && <p className="mt-2 text-body text-danger">{mock.error.message}</p>}
        </CardShell>
      )}
    </div>
  );
}
