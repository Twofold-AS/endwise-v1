'use client';

import { Check, CircleAlert, Lock, ShieldCheck, StatefulButton, Switch, Zap } from '@endwise/ui';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F5-27 — DEV-MODE-BRYTEREN. Bor i **Endwise-admin** › Settings, aldri i
 * forhandlerens. Det er ikke bare et rollespørsmål: en bryter en forhandler
 * kan SE, er en bryter en forhandler vil prøve å trykke på.
 *
 * Siden viser hele gaten åpent i stedet for bare av/på. Det er med vilje —
 * en sikkerhetsmekanisme man ikke kan se tilstanden til, er en man ender opp
 * med å gjette på.
 *
 * Seed-knappen peker på en valgt demo-tenant. Endwise-admin sitter i
 * plattform-tenanten, så «seed denne sesjonen» ville vært en død knapp.
 */
export default function EndwiseInnstillingerPage() {
  const utils = trpc.useUtils();
  const dev = trpc.tenants.devMode.useQuery();
  const meg = trpc.tenants.current.useQuery();
  const liste = trpc.tenants.list.useQuery();

  const settGlobal = trpc.flags.setGlobal.useMutation({
    onSuccess: () => {
      utils.tenants.devMode.invalidate();
      utils.session.me.invalidate();
    },
  });
  const seed = trpc.tenants.seedDemo.useMutation();

  const status = dev.data;
  const flagOn = status?.flagOn ?? false;
  const demoTenants = useMemo(
    () => (liste.data ?? []).filter((t) => t.kind === 'demo'),
    [liste.data],
  );
  const [valgtId, setValgtId] = useState<string>('');
  const aktivId =
    valgtId || (meg.data?.kind === 'demo' ? meg.data.id : '') || demoTenants[0]?.id || '';
  const valgt = demoTenants.find((t) => t.id === aktivId) ?? null;
  const kanSeede = flagOn && Boolean(valgt);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Endwise-admin · Innstillinger</h1>
        <p className="text-title text-fg">Dev-mode</p>
        <p className="text-body text-fg-muted">
          Gå gjennom hele produktet med demo-data som går gjennom ekte backend og RLS.
        </p>
      </div>

      {/* ── Bryteren ───────────────────────────────────────────────────── */}
      <CardShell className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-2 text-label text-fg">
              <Zap size={16} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
              Dev-mode-flagget
            </p>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Globalt release-flagg (<code>dev-mode</code>). Kan ikke overstyres per forhandler —
              nøkkelen står på sperrelista i <code>flags.setOverride</code>.
            </p>
          </div>
          <Switch
            checked={flagOn}
            disabled={settGlobal.isPending || dev.isLoading}
            onCheckedChange={(v) => settGlobal.mutate({ key: 'dev-mode', enabled: v })}
            aria-label="Dev-mode"
          />
        </div>

        {settGlobal.error && (
          <p className="mt-3 flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {settGlobal.error.message}
          </p>
        )}
      </CardShell>

      {/* ── Gaten, synlig ──────────────────────────────────────────────── */}
      <CardShell className="p-5">
        <p className="flex items-center gap-2 text-label text-fg">
          <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Tre betingelser — alle må holde
        </p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Flagget alene gir ingenting. Betingelsene feiler ulikt, og derfor er én glipp ikke nok til
          å åpne noe.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Betingelse
            ok={flagOn}
            tittel="Flagget er på"
            forklaring="Globalt release-flagg, styrt av bryteren over."
          />
          <Betingelse
            ok={status?.isEndwiseAdmin ?? false}
            tittel="Rollen er endwise_admin"
            forklaring="Håndheves server-side i resolveDevMode — aldri av flagget alene."
          />
          <Betingelse
            ok={status?.isDemoTenant ?? false}
            tittel="Tenanten er en demo-tenant"
            forklaring={
              meg.data
                ? `Du er i «${meg.data.name}» (kind: ${meg.data.kind}). Seed under peker på en valgt demo-tenant, ikke nødvendigvis denne.`
                : 'tenants.kind må være demo for at dev-mode skal slå inn i sesjonen.'
            }
          />
        </div>

        <div
          className={`mt-4 flex items-center gap-2 rounded-control px-3 py-2.5 text-label ${
            status?.enabled ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-muted'
          }`}
        >
          {status?.enabled ? (
            <Check size={16} strokeWidth={2} className="shrink-0" />
          ) : (
            <Lock size={16} strokeWidth={1.75} className="shrink-0" />
          )}
          {status?.enabled
            ? 'Dev-mode er AKTIV i denne sesjonen'
            : 'Dev-mode er av i denne sesjonen'}
        </div>
      </CardShell>

      {/* ── Demo-data ──────────────────────────────────────────────────── */}
      <CardShell className="p-5">
        <p className="text-label text-fg">Fyll en demo-tenant med data</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Oppretter mekaniker-profil, en tjeneste og en kunde — gjennom vanlige tRPC-ruter med{' '}
          <code>withTenant</code>, ikke som DB-eier. Ekte forhandlere (live) seedes aldri herfra.
        </p>

        {!flagOn ? (
          <p className="mt-3 text-body text-fg-muted">
            Slå på dev-mode-flagget over først. Uten flagget gjør knappen ingenting.
          </p>
        ) : demoTenants.length === 0 ? (
          <p className="mt-3 text-body text-fg-muted">
            Ingen demo-tenant. Merk en forhandler som demo på Forhandlere, eller opprett en ny med
            avkrysningen. Live-forhandlere skal være tomme.
          </p>
        ) : (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-label text-fg">Demo-tenant</span>
            <select
              value={aktivId}
              onChange={(e) => setValgtId(e.target.value)}
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none focus-visible:border-fg"
            >
              {demoTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
        )}

        {seed.error && (
          <p className="mt-3 flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {seed.error.message}
          </p>
        )}
        {seed.isSuccess && valgt ? (
          <p className="mt-3 text-body text-success">
            Ferdig. «{valgt.name}» har mekaniker, tjeneste og kunde.
          </p>
        ) : null}

        {kanSeede ? (
          <div className="mt-4 flex justify-end">
            <StatefulButton
              disabled={seed.isPending}
              onClick={() => seed.mutate({ tenantId: valgt?.id })}
              state={
                seed.isPending
                  ? 'loading'
                  : seed.isError
                    ? 'error'
                    : seed.isSuccess
                      ? 'success'
                      : 'idle'
              }
              loadingText="Seeder…"
              successText="Ferdig"
              errorText="Feilet"
            >
              Seed demo-data
            </StatefulButton>
          </div>
        ) : null}
      </CardShell>
    </div>
  );
}

function Betingelse({
  ok,
  tittel,
  forklaring,
}: {
  ok: boolean;
  tittel: string;
  forklaring: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-control border border-border px-3 py-2.5">
      <span
        aria-hidden
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${
          ok ? 'bg-success text-white' : 'bg-surface-2 text-fg-muted'
        }`}
      >
        {ok ? <Check size={11} strokeWidth={3} /> : <Lock size={10} strokeWidth={2} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-label text-fg">{tittel}</span>
        <span className="text-[12px] text-fg-muted">{forklaring}</span>
      </span>
    </div>
  );
}
