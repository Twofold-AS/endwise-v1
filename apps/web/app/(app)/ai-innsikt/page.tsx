'use client';

import {
  AiDisclosure,
  Blocks,
  Check,
  DotmCircular1,
  DotmHex1,
  DotmSquare1,
  Lock,
  ShieldCheck,
  Sparkles,
  StatefulButton,
  TriangleAlert,
} from '@endwise/ui';
import { type FormEvent, useCallback, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useEventStream } from '../_lib/use-event-stream';
import { CardMedia, CardShell } from '../_shell/cards';
import { SseStatusPill } from '../_shell/sse-status-pill';

/**
 * F6-04 / F5-22 — AI-INNSIKT: flaten over AI-laget. Flyttet 04.08.2026 fra
 * /integrasjoner/ai til /ai-innsikt — den er en egen destinasjon i sidebaren,
 * ikke en integrasjonsinnstilling.
 *
 * To halvdeler, og de svarer på hvert sitt spørsmål:
 *   1. **Rutingen** — hvilken leverandør, i hvilken region, for hvilken
 *      dataklasse? Lest fra serveren (`agent.list`), ikke gjentatt her. Kilden
 *      er `packages/providers`; denne skjermen er et vindu, ikke en kopi.
 *   2. **Konsollen** — kjør en agent og se den tenke i sanntid. Tokenene kommer
 *      over SSE (F6-02), samme kanal som meldingene, fordi agent-svar ER
 *      meldinger som ikke har landet ennå.
 *
 * ⚠️ **To ting i F6-04 finnes ikke i backend ennå: confidence-score og
 * token-tak per tenant.** De står som eksplisitt tomme nederst. Å tegne et tall
 * der ville vært å påstå at vi måler noe vi ikke måler.
 *
 * [ART50-UI] `AiDisclosure` står øverst. Art. 50 gjelder også når det er en
 * ansatt som snakker med maskinen.
 */
type Phase = 'idle' | 'starting' | 'thinking' | 'tool' | 'done' | 'error';

/** Én loader per SSE-event (UI-PAKKER.md §4). Fasen bestemmer hvilken. */
const PHASE_LOADER: Record<string, { Loader: typeof DotmCircular1; label: string }> = {
  starting: { Loader: DotmCircular1, label: 'Starter agenten …' },
  thinking: { Loader: DotmHex1, label: 'Assistenten tenker …' },
  tool: { Loader: DotmSquare1, label: 'Henter data …' },
};

export default function AiDiagnosePage() {
  const agents = trpc.agent.list.useQuery();
  const run = trpc.agent.run.useMutation();

  const [agent, setAgent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [output, setOutput] = useState('');
  // Verktøykall er en append-only logg og kan gjentas (samme verktøy to ganger
  // i én kjøring er normalt) — derfor en egen `seq`, ikke navnet, som React-key.
  const [tools, setTools] = useState<Array<{ seq: number; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const onStreamEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    switch (event.type) {
      case 'agent.start':
        setPhase('thinking');
        break;
      case 'agent.token':
        setPhase('thinking');
        setOutput((current) => current + String(event.data.text ?? ''));
        break;
      case 'agent.tool_call':
        setPhase('tool');
        setTools((current) => [
          ...current,
          { seq: current.length, name: String(event.data.tool ?? 'ukjent') },
        ]);
        break;
      case 'agent.tool_result':
        setPhase('thinking');
        break;
      case 'agent.done':
        setPhase('done');
        // `agent.done` bærer hele teksten. Vi bytter til den fordi et tapt
        // token underveis ellers ville stått igjen som et hull i svaret.
        if (event.data.text) setOutput(String(event.data.text));
        break;
      case 'agent.error':
        setPhase('error');
        setError(String(event.data.message ?? 'Ukjent feil i agenten'));
        break;
      default:
        break;
    }
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, []);

  const streamStatus = useEventStream(onStreamEvent);

  const selected = (agents.data ?? []).find((a) => a.name === agent) ?? agents.data?.[0];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || !selected) return;
    setOutput('');
    setTools([]);
    setError(null);
    setPhase('starting');
    run.mutate(
      { agent: selected.name, message: text },
      {
        onError: (err) => {
          setPhase('error');
          setError(err.message);
        },
      },
    );
  }

  const loader = PHASE_LOADER[phase];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-title text-fg">AI-innsikt</h1>
          <p className="text-body text-fg-muted">
            Hvilken modell svarer, hvor kjører den — og hva sier den akkurat nå.
          </p>
        </div>
        <SseStatusPill state={streamStatus} />
      </div>

      {/* [ART50-UI] Øverst, før første interaksjon. Ikke flytt den ned. */}
      <AiDisclosure className="rounded-lg" />

      {/* ── 1. Ruting: dataklasse → region → leverandør ───────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Ruting og leverandører</h2>
        {agents.isLoading ? (
          <div className="py-8 text-center text-body text-fg-muted">Leser agent-registeret …</div>
        ) : agents.isError ? (
          <CardShell className="p-6">
            <p className="text-body text-danger">
              Kunne ikke lese agent-registeret: {agents.error.message}
            </p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Krever forhandler-admin — driftsinnsyn er ikke for alle roller.
            </p>
          </CardShell>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {(agents.data ?? []).map((a) => {
              const regionOk = a.requiredRegion === 'global' || a.providerRegion === 'eu';
              return (
                <CardShell key={a.name}>
                  <CardMedia className="flex flex-col gap-2.5 p-4">
                    <div className="flex h-row items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-label text-fg">
                        <Sparkles size={16} className="text-accent-strong" />
                        {a.name}
                      </span>
                      <span
                        className={`inline-flex h-badge items-center gap-1 rounded-badge px-2 font-medium text-[11px] ${
                          regionOk ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                        }`}
                      >
                        {regionOk ? <Check size={12} /> : <TriangleAlert size={12} />}
                        {regionOk ? 'Region OK' : 'Regionsbrudd'}
                      </span>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                      <Meta label="Dataklasse" value={a.dataClass} />
                      <Meta label="Krever region" value={a.requiredRegion.toUpperCase()} />
                      <Meta
                        label="Leverandør"
                        value={`${a.provider} · ${a.providerRegion.toUpperCase()}`}
                      />
                      <Meta label="Modellrolle" value={a.role} />
                      <Meta label="Maks steg" value={String(a.maxSteps)} />
                      <Meta label="Krever modul" value={a.requiredModule ?? '—'} />
                    </dl>
                    {!a.providerConfigured && (
                      <p className="flex items-center gap-1.5 rounded-badge bg-warn-soft px-2 py-1.5 text-[12px] text-warn">
                        <Lock size={14} className="shrink-0" />
                        API-nøkkel mangler — kjører mot mock-leverandør lokalt.
                      </p>
                    )}
                  </CardMedia>
                </CardShell>
              );
            })}
          </div>
        )}
        <p className="flex items-start gap-1.5 text-[12px] text-fg-muted">
          <ShieldCheck size={14} className="mt-px shrink-0" />
          Rutingen håndheves i <code className="text-fg-muted">spawnAgent()</code> og{' '}
          <code className="text-fg-muted">runAgent()</code>, ikke her. Denne tabellen viser hva
          serveren faktisk vil gjøre — den bestemmer ingenting.
        </p>
      </section>

      {/* ── 2. Konsollen ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Konsoll</h2>
        <CardShell>
          <CardMedia className="flex min-h-[220px] flex-col gap-3 p-4">
            {phase === 'idle' && !output ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                <Blocks size={24} className="text-fg-muted" />
                <p className="text-body text-fg-muted">
                  Still et spørsmål under, så ser du svaret bygge seg opp her.
                </p>
              </div>
            ) : (
              <>
                {loader && (
                  <div className="flex items-center gap-3">
                    {/* Ingen `colorPreset` — de er hardkodede farger. Vi mater
                        inn merkevare-aksenten fra token-laget i stedet. */}
                    <loader.Loader
                      size={28}
                      color="var(--ew-accent-strong)"
                      bloom
                      ariaLabel={loader.label}
                    />
                    {/* Loaderen forsterker — teksten bærer. */}
                    <span className="text-label text-fg-muted">{loader.label}</span>
                  </div>
                )}
                {tools.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tools.map((tool) => (
                      <span
                        key={tool.seq}
                        className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-2 font-mono text-[11px] text-fg-muted"
                      >
                        {tool.name}()
                      </span>
                    ))}
                  </div>
                )}
                <div ref={outputRef} className="max-h-[320px] overflow-y-auto">
                  <p className="whitespace-pre-wrap text-body text-fg">{output || '…'}</p>
                </div>
                {phase === 'done' && (
                  <p className="flex items-center gap-1.5 text-[12px] text-success">
                    <Check size={14} /> Ferdig
                  </p>
                )}
                {error && (
                  <p className="flex items-start gap-1.5 text-[12px] text-danger">
                    <TriangleAlert size={14} className="mt-px shrink-0" />
                    {error}
                  </p>
                )}
              </>
            )}
          </CardMedia>
          <form onSubmit={onSubmit} className="flex flex-col gap-2 px-1.5 pt-2 pb-1">
            <div className="flex items-center gap-2">
              <select
                value={selected?.name ?? ''}
                onChange={(e) => setAgent(e.target.value)}
                disabled={!agents.data?.length}
                className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                aria-label="Velg agent"
              >
                {(agents.data ?? []).map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={4000}
                placeholder="F.eks. «hvor mange bookinger har vi i dag?»"
                aria-label="Spørsmål til agenten"
                className="h-control flex-1 rounded-control border border-border bg-bg px-3 text-body text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
              />
              <StatefulButton
                type="submit"
                state={
                  run.isPending || phase === 'starting' || phase === 'thinking' || phase === 'tool'
                    ? 'loading'
                    : phase === 'error'
                      ? 'error'
                      : phase === 'done'
                        ? 'success'
                        : 'idle'
                }
                loadingText="Kjører…"
                successText="Ferdig"
                errorText="Feilet"
                disabled={!prompt.trim() || !selected}
              >
                Kjør
              </StatefulButton>
            </div>
          </form>
        </CardShell>
      </section>

      {/* ── 3. Det som IKKE er bygget ────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Ikke bygget ennå</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <NotBuilt
            title="Confidence-score"
            what="Hvor sikker agenten var på svaret."
            why="Terskelen som utløser automatisk eskalering (F6-05) leser denne. I dag eskalerer agenten bare når den selv ber om det, eller når en guardrail stopper den."
          />
          <NotBuilt
            title="Token-tak per tenant"
            what="Forbruk og grense per forhandler, per måned."
            why="Uten et tak er AI-kostnaden ubegrenset per tenant. Modellkatalogen kan allerede rute per plan — det som mangler er målingen og grensen."
          />
        </div>
        <p className="text-[12px] text-fg-muted">
          Begge hører til F6-04 i roadmap, som fortsatt står som <code>progress</code>. Feltene står
          tomme med vilje: et tall her ville sagt at vi måler noe vi ikke måler.
        </p>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[12px] text-fg-muted">{label}</dt>
      <dd className="truncate font-mono text-[12px] text-fg">{value}</dd>
    </>
  );
}

function NotBuilt({ title, what, why }: { title: string; what: string; why: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border border-dashed bg-inset p-4">
      <div className="flex h-row items-center justify-between gap-2">
        <span className="text-label text-fg-muted">{title}</span>
        <span className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-2 font-medium text-[11px] text-fg-muted">
          Mangler backend
        </span>
      </div>
      <p className="text-body text-fg-muted">{what}</p>
      <p className="text-[12px] text-fg-muted leading-relaxed">{why}</p>
    </div>
  );
}
