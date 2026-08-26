'use client';

import { Blocks, Input, Lock, RefreshCw, ShieldCheck, TriangleAlert, Upload } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { CardShell } from '../../_shell/cards';

/**
 * F8-01 / F8-02 — Quick-integrasjon (QuickLite).
 *
 * SYNK-MODELL: Quick er FAKTA. PULL (Quick → Endwise) dominerer og overskriver
 * våre felt — automatisk 08:00/16:00 (Oslo, kun i produksjon) + manuell «Hent nå».
 * PUSH (Endwise → Quick) er ALDRI automatisk: kun en bevisst, knapp-utløst
 * handling, tydelig adskilt (kommer — venter på ApiV2-token).
 *
 * Tokenet lagres envelope-kryptert og vises ALDRI tilbake. Kun forhandler-admin
 * kan endre — server håndhever via adminProcedure + RLS; dette er kosmetisk gating.
 */
export default function QuickPage() {
  const { isAdmin, isLoading: roleLoading } = useOrgRole();
  const utils = trpc.useUtils();
  const config = trpc.quick.config.useQuery();

  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [dirty, setDirty] = useState(false);

  // Prefyll baseUrl fra lagret config (til brukeren rører feltet).
  const savedBaseUrl = config.data?.baseUrl ?? '';
  const baseUrlValue = dirty ? baseUrl : savedBaseUrl;

  const save = trpc.quick.setConfig.useMutation({
    onSuccess: () => {
      setToken('');
      setDirty(false);
      utils.quick.config.invalidate();
      utils.session.me.invalidate();
    },
  });
  const test = trpc.quick.testConnection.useMutation({
    onSettled: () => {
      utils.quick.config.invalidate();
      utils.session.me.invalidate();
    },
  });
  const conflicts = trpc.conflicts.list.useQuery(undefined, { enabled: isAdmin });
  const pull = trpc.quick.pullNow.useMutation({
    onSettled: () => {
      utils.quick.config.invalidate();
      utils.conflicts.list.invalidate();
      utils.session.me.invalidate();
    },
  });
  const resolve = trpc.conflicts.resolve.useMutation({
    onSettled: () => utils.conflicts.list.invalidate(),
  });

  const openConflicts = conflicts.data ?? [];
  const hasToken = config.data?.hasToken ?? false;
  const canSave =
    isAdmin && baseUrlValue.trim().length > 0 && (hasToken || token.trim().length > 0);
  const configured = Boolean(savedBaseUrl) && hasToken;

  function onSave() {
    save.mutate({
      baseUrl: baseUrlValue.trim(),
      token: token.trim() ? token.trim() : undefined,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <div className="flex items-center gap-2">
        <Blocks size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Quick</h1>
        {openConflicts.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/12 px-2 py-0.5 text-[11px] text-danger">
            <TriangleAlert size={12} /> {openConflicts.length} konflikt
            {openConflicts.length === 1 ? '' : 'er'}
          </span>
        )}
        <span className="ml-auto text-fg-faint text-xs">
          QuickLite · Quick er fakta · pull overskriver lokalt
        </span>
      </div>

      {!roleLoading && !isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-fg-muted text-xs">
          <Lock size={13} /> Kun forhandler-admin kan endre Quick-konfigurasjonen.
        </div>
      )}

      {config.isError ? (
        <CardShell className="p-5">
          <p className="text-body text-danger">{config.error.message}</p>
        </CardShell>
      ) : null}

      {/* Konfig-kort */}
      <CardShell>
        <div className="flex flex-1 flex-col gap-4 rounded-lg bg-inset p-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-[13px] text-fg">Tilkobling</span>
            <p className="text-[12px] text-fg-faint leading-snug">
              Per forhandler: egen Quick-instans + eget ApiV2-token (lages i Quick3 under Client
              Configuration → Security → Access Token, type ApiV2). Nøkkelen testes med et lesekall
              (GET) mot Quick før den lagres. Vi lagrer aldri klartekst.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-fg-muted">Base-URL</span>
            <Input
              value={baseUrlValue}
              onChange={(e) => {
                setDirty(true);
                setBaseUrl(e.target.value);
              }}
              disabled={!isAdmin}
              placeholder="https://q3.quick.no/ProdShared008"
              spellCheck={false}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-fg-muted">
              API-token {hasToken && <span className="text-fg-faint">· lagret (kryptert)</span>}
            </span>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={!isAdmin}
              placeholder={
                hasToken ? '•••••••• (la stå tomt for å beholde)' : 'Lim inn ApiV2-token'
              }
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || save.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {save.isPending ? 'Tester og lagrer…' : 'Test og lagre'}
            </button>

            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={!isAdmin || !configured || test.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 font-medium text-fg text-sm transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              <ShieldCheck size={15} />
              {test.isPending ? 'Tester…' : 'Test tilkobling'}
            </button>
          </div>

          {test.data && (
            <StatusLine
              ok={test.data.ok}
              text={test.data.ok ? 'Tilkobling OK' : `Feilet: ${test.data.detail ?? 'ukjent'}`}
            />
          )}
          {save.isError && <StatusLine ok={false} text={save.error.message} />}
        </div>
      </CardShell>

      {/* Pull-kort (Quick → Endwise) — dominerer */}
      <CardShell>
        <div className="flex flex-1 flex-col gap-3 rounded-lg bg-inset p-5">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="text-primary" />
            <span className="font-semibold text-[13px] text-fg">Hent fra Quick (pull)</span>
            <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              Quick → Endwise · overskriver
            </span>
          </div>
          <p className="text-[12px] text-fg-faint leading-snug">
            Automatisk <span className="text-fg">08:00 og 16:00</span> (norsk tid, kun i
            produksjon). Quick vinner: hentede felt overskriver våre. Henter{' '}
            <span className="text-fg">kunder og deler/lager</span> inn i Postgres (ikke filer).
            Reservasjoner i Endwise beholdes. Lokale-kun-felt (Min side-kobling, notater) bevares.
            Lokalt kjører pull kun manuelt.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => pull.mutate({})}
              disabled={!isAdmin || !configured || pull.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <RefreshCw size={15} className={pull.isPending ? 'animate-spin' : undefined} />
              {pull.isPending ? 'Henter…' : 'Hent nå'}
            </button>
          </div>

          {pull.data?.ok && (
            <StatusLine
              ok={pull.data.conflicts === 0}
              text={
                pull.data.conflicts > 0
                  ? `Hentet ${pull.data.customers} kunde(r) og ${pull.data.parts} del(er) · ${pull.data.conflicts} konflikt(er) å løse under.`
                  : `Hentet ${pull.data.customers} kunde(r) og ${pull.data.parts} del(er) · ${pull.data.stock} lagerlinje(r).`
              }
            />
          )}
          {pull.isError && (
            <StatusLine ok={false} text="Klarte ikke hente fra Quick. Prøv igjen." />
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-border border-t pt-3 text-[12px]">
            <dt className="text-fg-faint">Sist hentet</dt>
            <dd className="text-fg">{fmtDate(config.data?.lastSyncedAt) ?? 'Aldri'}</dd>
            <dt className="text-fg-faint">Siste utfall</dt>
            <dd className="text-fg">{config.data?.lastSyncStatus ?? '—'}</dd>
            <dt className="text-fg-faint">Detalj</dt>
            <dd className="text-fg-muted">{config.data?.lastSyncDetail ?? '—'}</dd>
          </dl>
        </div>
      </CardShell>

      {/* Synk-konflikter-panel (tre-veis fletting) */}
      {isAdmin && openConflicts.length > 0 && (
        <ConflictsCard
          conflicts={openConflicts}
          onResolve={(conflictId, resolution) => resolve.mutate({ conflictId, resolution })}
          pending={resolve.isPending ? resolve.variables?.conflictId : undefined}
        />
      )}

      {/* Push-kort (Endwise → Quick) — bevisst, adskilt, kommer */}
      <CardShell>
        <div className="flex flex-1 flex-col gap-3 rounded-lg bg-inset p-5">
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-fg-muted" />
            <span className="font-semibold text-[13px] text-fg">Send til Quick (push)</span>
            <span className="ml-auto rounded bg-surface-2 px-2 py-0.5 text-[10px] text-fg-muted">
              Endwise → Quick · manuell
            </span>
          </div>
          <p className="text-[12px] text-fg-faint leading-snug">
            Push er en <span className="text-fg">bevisst handling</span> — aldri automatisk, aldri
            en bieffekt av pull. Minimert med vilje for ikke å overkjøre Quick. Kommer når
            ApiV2-tokenet gir skrivetilgang.
          </p>
          <button
            type="button"
            disabled
            title="Push til Quick er ikke bygget ennå (venter på ApiV2-token)"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-card px-4 font-medium text-fg-muted text-sm opacity-50"
          >
            <Upload size={15} />
            Send til Quick (kommer)
          </button>
        </div>
      </CardShell>
    </div>
  );
}

type Conflict = {
  id: string;
  entity: string;
  field: string;
  baseValue: string | null;
  ourValue: string | null;
  theirValue: string | null;
};

function ConflictsCard({
  conflicts,
  onResolve,
  pending,
}: {
  conflicts: Conflict[];
  onResolve: (conflictId: string, resolution: 'quick' | 'local') => void;
  pending?: string;
}) {
  return (
    <CardShell>
      <div className="flex flex-1 flex-col gap-3 rounded-lg bg-inset p-5">
        <div className="flex items-center gap-2">
          <TriangleAlert size={15} className="text-danger" />
          <span className="font-semibold text-[13px] text-fg">Synk-konflikter</span>
          <span className="ml-auto rounded bg-danger/12 px-2 py-0.5 text-[10px] text-danger">
            {conflicts.length} åpen{conflicts.length === 1 ? '' : 'e'}
          </span>
        </div>
        <p className="text-[12px] text-fg-faint leading-snug">
          Både Quick og vi endret samme felt til ulik verdi. Ingen ble overskrevet — velg hvilken
          som skal gjelde.
        </p>

        <ul className="flex flex-col gap-3">
          {conflicts.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-fg-faint">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-fg-muted">{c.entity}</span>
                <span className="font-medium text-fg">{c.field}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <ValueCell label="Quick" value={c.theirValue} tone="quick" />
                <ValueCell label="Vår" value={c.ourValue} tone="ours" />
                <ValueCell label="Baseline" value={c.baseValue} tone="base" />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(c.id, 'quick')}
                  disabled={pending === c.id}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground text-[12px] transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  Behold Quick
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(c.id, 'local')}
                  disabled={pending === c.id}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 font-medium text-fg text-[12px] transition-colors hover:bg-surface-2 disabled:opacity-40"
                >
                  Behold vår
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-fg-faint leading-snug">
          «Behold vår» merker verdien for push til Quick (push er fortsatt manuell og gated).
        </p>
      </div>
    </CardShell>
  );
}

function ValueCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: 'quick' | 'ours' | 'base';
}) {
  const toneClass =
    tone === 'quick' ? 'text-primary' : tone === 'ours' ? 'text-fg' : 'text-fg-faint';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-fg-faint uppercase tracking-wide">{label}</span>
      <span className={`truncate ${toneClass}`} title={value ?? '—'}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function StatusLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-[12px] ${
        ok ? 'bg-primary/10 text-primary' : 'bg-danger/12 text-danger'
      }`}
    >
      {text}
    </div>
  );
}

function fmtDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' });
}
