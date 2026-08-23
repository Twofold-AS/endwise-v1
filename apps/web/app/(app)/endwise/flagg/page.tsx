'use client';

import {
  Badge,
  CircleAlert,
  Flag,
  Lock,
  Plus,
  ShieldCheck,
  StatefulButton,
  Switch,
} from '@endwise/ui';
import { useEffect, useMemo, useState } from 'react';
import { FLAG_DEFAULTS, FLAG_KEY_MAX, FLAG_KEY_PATTERN, FLAG_KEYS } from '@/flags';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { KjopteModulerTabell } from '../_kjopte-moduler';

/**
 * F0-04 — FEATURE-FLAGS i Endwise-admin.
 *
 * ── To brytere som ofte forveksles ────────────────────────────────────────
 * Denne siden er RELEASE-TOGGLES: har VI rullet ut en funksjon, globalt eller
 * per forhandler. Det er IKKE entitlements. Hva forhandleren har KJØPT bor i
 * `tenant_modules`, skrives KUN av Stripe-webhooken, og håndheves av
 * `moduleProcedure`. Begge må si ja. En bryter her åpner ikke en ubetalt modul.
 *
 * Sperren er `endwiseAdminProcedure` på listPlatform/setGlobal/setTenantOverride
 * — at siden ligger under /endwise er kosmetikk.
 */

type Plattform = RouterOutput['flags']['listPlatform'];
type Flagg = Plattform['globals'][number];
type TenantRad = Plattform['tenants'][number];

const KJENTE_FORKLARINGER: Record<string, string> = {
  'kill-switch': 'Plattform-kill-switch. Kan ikke overstyres per forhandler.',
  'dev-mode':
    'Dev-mode. Krever i tillegg endwise_admin og demo-tenant — flagget alene gir ingenting.',
};

export default function EndwiseFlaggPage() {
  const utils = trpc.useUtils();
  const plattform = trpc.flags.listPlatform.useQuery(undefined, { retry: false });
  const entitlements = trpc.tenants.listModules.useQuery(undefined, { retry: false });

  const [valgtTenant, setValgtTenant] = useState<string>('');
  const [nyNokkel, setNyNokkel] = useState('');
  const [nyBeskrivelse, setNyBeskrivelse] = useState('');

  const etterSkriving = () => {
    void utils.flags.listPlatform.invalidate();
    void utils.flags.resolve.invalidate();
    void utils.tenants.devMode.invalidate();
  };

  const settGlobal = trpc.flags.setGlobal.useMutation({ onSuccess: etterSkriving });
  const settOverride = trpc.flags.setTenantOverride.useMutation({ onSuccess: etterSkriving });
  const fjernOverride = trpc.flags.clearTenantOverride.useMutation({ onSuccess: etterSkriving });
  const opprett = trpc.flags.upsert.useMutation({
    onSuccess: () => {
      etterSkriving();
      setNyNokkel('');
      setNyBeskrivelse('');
    },
  });

  const globals = useMemo(
    () => slåSammenKjente(plattform.data?.globals ?? [], plattform.data?.lockedKeys ?? []),
    [plattform.data],
  );
  const tenants = plattform.data?.tenants ?? [];
  const locked = new Set(plattform.data?.lockedKeys ?? []);

  useEffect(() => {
    if (valgtTenant || tenants.length === 0) return;
    setValgtTenant(tenants[0]?.id ?? '');
  }, [tenants, valgtTenant]);

  const tenant = tenants.find((t) => t.id === valgtTenant) ?? null;
  const skriver =
    settGlobal.isPending || settOverride.isPending || fjernOverride.isPending || opprett.isPending;
  const feil =
    plattform.error ??
    settGlobal.error ??
    settOverride.error ??
    fjernOverride.error ??
    opprett.error;

  const trimmet = nyNokkel.trim();
  const nokkelOk = FLAG_KEY_PATTERN.test(trimmet) && trimmet.length <= FLAG_KEY_MAX;

  if (plattform.isError && !plattform.data) {
    return (
      <div className="mx-auto w-full max-w-[880px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-body text-danger">{plattform.error.message}</p>
        </CardShell>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Endwise-admin · Feature-flags</h1>
        <p className="text-title text-fg">Feature-flags</p>
        <p className="text-body text-fg-muted">
          Release-toggles — om <b>vi</b> har rullet ut en funksjon. De to plattformnøklene
          (dev-mode, kill-switch) er bevisst få. En bryter her selger ikke en modul.
        </p>
      </div>

      <CardShell className="p-5">
        <p className="flex items-center gap-2 text-label text-fg">
          <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          To brytere. Begge må si ja.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Skille
            tittel="Feature-flags — denne siden"
            tekst="feature_flags + feature_flag_overrides. Globalt eller per forhandler. Styres her. Sperren er server-side."
          />
          <Skille
            tittel="Entitlements — ikke her"
            tekst="tenant_modules. Hva forhandleren har betalt for. Skrives kun av Stripe-webhooken. Håndheves av moduleProcedure. Tabellen under er read-only."
          />
        </div>
      </CardShell>

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Kjøpte moduler (read-only)</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Hva forhandleren faktisk har betalt for. Feature-flags kan ikke skru dette på. Skrivesti:
          Stripe (F5-32).
        </p>
        <KjopteModulerTabell
          rader={entitlements.data}
          laster={entitlements.isLoading}
          feil={entitlements.error?.message}
        />
      </section>

      {feil && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {feil.message}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Globalt</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Standard for alle forhandlere. Per-tenant overstyring vinner, unntatt plattformnøkler som
          ikke kan overstyres.
        </p>
        {plattform.isLoading ? (
          <p className="py-8 text-center text-body text-fg-muted">Laster …</p>
        ) : globals.length === 0 ? (
          <CardShell className="p-8 text-center">
            <p className="text-label text-fg">Ingen flagg ennå</p>
            <p className="mt-1 text-[12px] text-fg-muted">Opprett det første i skjemaet nederst.</p>
          </CardShell>
        ) : (
          <div className="flex flex-col gap-2">
            {globals.map((g) => (
              <CardShell key={g.key} className="p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 text-label text-fg">
                      <Flag size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                      <code>{g.key}</code>
                      {!g.overridable && <Badge variant="secondary">Plattformstyrt</Badge>}
                    </p>
                    <p className="text-[12px] text-fg-muted leading-relaxed">
                      {g.description ?? KJENTE_FORKLARINGER[g.key] ?? 'Release-toggle.'}
                    </p>
                  </div>
                  <Switch
                    checked={g.enabled}
                    disabled={skriver || plattform.isFetching}
                    onCheckedChange={(v) => settGlobal.mutate({ key: g.key, enabled: v })}
                    aria-label={`Globalt flagg ${g.key}`}
                  />
                </div>
              </CardShell>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Per forhandler</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Overstyrer det globale flagget for én tenant. Tom overstyring = arver global. Dette endrer
          ikke hva forhandleren har kjøpt.
        </p>

        {tenants.length === 0 ? (
          <CardShell className="p-8 text-center">
            <p className="text-label text-fg">Ingen forhandlere</p>
            <p className="mt-1 text-[12px] text-fg-muted">Opprett en under Forhandlere først.</p>
          </CardShell>
        ) : (
          <CardShell className="flex flex-col gap-4 p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Forhandler</span>
              <select
                value={valgtTenant}
                onChange={(e) => setValgtTenant(e.target.value)}
                className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none focus-visible:border-fg"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.kind === 'demo' ? ' (demo)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {tenant && (
              <div className="flex flex-col gap-2">
                {globals.map((g) => (
                  <TenantFlaggRad
                    key={g.key}
                    flagg={g}
                    tenant={tenant}
                    locked={locked.has(g.key)}
                    disabled={skriver || plattform.isFetching}
                    onToggle={(enabled) =>
                      settOverride.mutate({ tenantId: tenant.id, key: g.key, enabled })
                    }
                    onClear={() => fjernOverride.mutate({ tenantId: tenant.id, key: g.key })}
                  />
                ))}
              </div>
            )}
          </CardShell>
        )}
      </section>

      <CardShell className="p-5">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nokkelOk) return;
            opprett.mutate({
              key: nyNokkel.trim(),
              description: nyBeskrivelse.trim() || undefined,
            });
          }}
        >
          <p className="flex items-center gap-2 text-label text-fg">
            <Plus size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
            Nytt feature-flag
          </p>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Oppretter en nøkkel i <code>feature_flags</code>, av som default. Ikke en modul og ikke
            en Stripe-linje.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Nøkkel</span>
              <input
                value={nyNokkel}
                onChange={(e) => setNyNokkel(e.target.value)}
                maxLength={FLAG_KEY_MAX}
                placeholder="canary-booking"
                className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
              />
              <span className="text-[12px] text-fg-muted">
                Små bokstaver, tall og bindestrek. Samme form som slug.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Beskrivelse</span>
              <input
                value={nyBeskrivelse}
                onChange={(e) => setNyBeskrivelse(e.target.value)}
                placeholder="Hva flagget styrer"
                className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <StatefulButton
              type="submit"
              disabled={opprett.isPending || !nokkelOk}
              state={
                opprett.isPending
                  ? 'loading'
                  : opprett.isError
                    ? 'error'
                    : opprett.isSuccess
                      ? 'success'
                      : 'idle'
              }
              loadingText="Oppretter…"
              successText="Opprettet"
              errorText="Feilet"
            >
              Opprett flagg
            </StatefulButton>
          </div>
        </form>
      </CardShell>
    </div>
  );
}

function Skille({ tittel, tekst }: { tittel: string; tekst: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-border px-3 py-2.5">
      <span className="text-label text-fg">{tittel}</span>
      <span className="text-[12px] text-fg-muted leading-relaxed">{tekst}</span>
    </div>
  );
}

function TenantFlaggRad({
  flagg,
  tenant,
  locked,
  disabled,
  onToggle,
  onClear,
}: {
  flagg: Flagg;
  tenant: TenantRad;
  locked: boolean;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
  onClear: () => void;
}) {
  const override = tenant.overrides.find((o) => o.flagKey === flagg.key);
  const verdi = override?.enabled ?? flagg.enabled;

  return (
    <div className="flex items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-label text-fg">
          <code>{flagg.key}</code>
          {locked ? (
            <Badge variant="secondary">Låst</Badge>
          ) : override ? (
            <Badge variant="outline">Overstyrer</Badge>
          ) : (
            <Badge variant="secondary">Følger global</Badge>
          )}
        </span>
        <span className="text-[12px] text-fg-muted">
          {locked
            ? 'Plattformstyrt — kan ikke overstyres per forhandler. Sperren står på serveren.'
            : override
              ? `Satt til ${override.enabled ? 'på' : 'av'} for ${tenant.name}.`
              : `Arver global (${flagg.enabled ? 'på' : 'av'}).`}
        </span>
        {!locked && override && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="mt-1 w-fit text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
          >
            Fjern overstyring
          </button>
        )}
      </div>
      {locked ? (
        <Lock size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-fg-muted" aria-hidden />
      ) : (
        <Switch
          checked={verdi}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={`Overstyr ${flagg.key} for ${tenant.name}`}
        />
      )}
    </div>
  );
}

/** Kjente nøkler vises selv om de ikke er insertet ennå — fail-closed av. */
function slåSammenKjente(globals: Flagg[], lockedKeys: string[]): Flagg[] {
  const sett = new Map(globals.map((g) => [g.key, g]));
  for (const key of FLAG_KEYS) {
    if (sett.has(key)) continue;
    sett.set(key, {
      key,
      description: KJENTE_FORKLARINGER[key] ?? null,
      enabled: FLAG_DEFAULTS[key],
      overridable: !lockedKeys.includes(key),
    });
  }
  return [...sett.values()].sort((a, b) => a.key.localeCompare(b.key));
}
