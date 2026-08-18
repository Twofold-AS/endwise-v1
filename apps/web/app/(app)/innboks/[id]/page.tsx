'use client';

import {
  CircleUser,
  HumanHandoverNotice,
  MessageSquare,
  Sparkles,
  StatefulButton,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLyd } from '../../_lib/lyd';
import { useEventStream } from '../../_lib/use-event-stream';
import { CardShell } from '../../_shell/cards';
import { type Kanal, KanalLinje, KanalMerke, tilKanal } from '../_kanal';
import {
  agentName,
  authorLabel,
  fmtDayHeading,
  fmtTime,
  isAgent,
  KIND_LABEL,
  KIND_TONE,
  ROLLE_LABEL,
  threadHeading,
  visningForTraadtype,
} from '../_lib';

/**
 * F6-01 — Tråden. F6-05 — overtakelsen fra AI, i SAMME tråd.
 *
 * Det som gjør eskaleringen synlig her er ikke en egen «eskalert»-kolonne, men
 * at agenten skrev en systemmelding i tråden da den ga slipp (`escalateToHuman`).
 * Historikken over den er kontekst for mennesket som overtar — derfor vises hele
 * samtalen, ikke bare det som skjedde etter overtakelsen.
 *
 * `markRead` kjøres når tråden åpnes OG når det kommer nye meldinger mens den
 * står åpen. Uten det andre kallet ville uleste-telleren vokst mens brukeren
 * satt og så på meldingene.
 */
export default function TrådPage() {
  const params = useParams<{ id: string }>();
  const threadId = params.id;
  const utils = trpc.useUtils();
  const lyd = useLyd();

  const me = trpc.session.me.useQuery();
  const threads = trpc.messages.listThreads.useQuery();
  const messages = trpc.messages.listMessages.useQuery({ threadId });

  const [body, setBody] = useState('');
  const [justEscalated, setJustEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markRead = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.listThreads.invalidate(),
  });
  const post = trpc.messages.post.useMutation({
    onSuccess: () => {
      setBody('');
      utils.messages.listMessages.invalidate({ threadId });
      utils.messages.listThreads.invalidate();
      /**
       * ⚠️ **Avsenderens KVITTERING, ikke et varsel.**
       *
       * Serveren hopper over forfatteren når den publiserer `message.created`
       * (du skal ikke varsles om din egen melding), så uten denne linja hørte
       * avsenderen ingenting i det hele tatt. Lyden er svakere enn varselet:
       * du vet at du trykket send — du vet ikke at det kom noe.
       *
       * Ligger på `onSuccess`, ikke i `onSubmit`. En lyd som spiller før
       * serveren har svart, kvitterer for noe som kanskje ikke skjedde.
       */
      lyd.sendt();
    },
    onError: () => lyd.feil(),
  });

  const thread = (threads.data ?? []).find((t) => t.id === threadId);
  const rows = useMemo(() => messages.data ?? [], [messages.data]);

  /**
   * Navn på alle som HAR skrevet, pluss alle som ER i tråden.
   *
   * Begge kilder trengs: en deltaker som ennå ikke har skrevet skal likevel
   * kunne navngi tråden, og en forfatter som siden er tatt ut av tråden skal
   * ikke miste navnet sitt bakover i historikken.
   */
  const deltakerIder = useMemo(() => {
    const alle = [...rows.map((m) => m.authorId), ...(thread?.motparter ?? [])];
    return [...new Set(alle)].filter((id) => id && !isAgent(id));
  }, [rows, thread?.motparter]);

  /**
   * ⛔ Kallenavn KUN i interne tråder. Én tråd på skjermen = én visning, så her
   * er det enkelt: kundetråder får `offisiell`, og da ser serveren aldri engang
   * etter et kallenavn.
   *
   * Fram til tråden er lastet står visningen på `offisiell` — å defaulte til
   * `intern` mens vi venter ville betydd at et kallenavn kunne blinke innom i
   * en kundetråd før riktig svar kom.
   */
  const visning = thread ? visningForTraadtype(thread.kind) : 'offisiell';

  const navn = trpc.directory.participants.useQuery(
    { ids: deltakerIder, visning },
    { enabled: deltakerIder.length > 0, staleTime: 5 * 60_000 },
  );

  // Sanntid: bare for DENNE tråden. Eventet er varselklokka; innholdet hentes
  // gjennom tRPC (og dermed RLS).
  const onStreamEvent = useCallback(
    (event: { type: string; subjectId: string | null }) => {
      if (event.subjectId !== threadId) return;
      if (event.type === 'message.created') {
        void utils.messages.listMessages.invalidate({ threadId });
      }
      if (event.type === 'thread.escalated') {
        setJustEscalated(true);
        void utils.messages.listMessages.invalidate({ threadId });
      }
    },
    [threadId, utils],
  );
  // Sanntid kjører fortsatt — men uten statuspille. Eiers beslutning
  // 06.08.2026: statusmerker («Sanntid», «Live», «Aktive») er pynt som
  // konkurrerer med innholdet. Strømmen skal merkes ved at ting DUKKER OPP,
  // ikke ved en lampe som sier at den kunne dukket opp.
  useEventStream(onStreamEvent);

  // Åpne tråden = lese den. Kjøres på nytt når antallet meldinger endrer seg.
  const messageCount = rows.length;
  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;
  useEffect(() => {
    if (messageCount > 0) markReadRef.current({ threadId });
  }, [threadId, messageCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  /** Agenten er en deltaker med `agent:`-prefiks — den avslører seg i forfatterne. */
  const hasAgent = rows.some((m) => isAgent(m.authorId));
  const escalated = justEscalated || hasAgent;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    post.mutate({ threadId, body: text });
  }

  if (messages.isLoading) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster tråd …</div>;
  }
  if (messages.isError) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-8 py-7">
        <CardShell className="p-6">
          <p className="text-body text-danger">Kunne ikke åpne tråden: {messages.error.message}</p>
          <Link
            href={'/innboks' as Route}
            className="mt-3 text-accent-strong text-body hover:underline"
          >
            ← Tilbake til innboksen
          </Link>
        </CardShell>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[820px] flex-col gap-4 px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={'/innboks' as Route}
            className="text-[12px] text-fg-muted transition-colors hover:text-fg"
          >
            ← Meldinger
          </Link>
          <h1 className="mt-1 truncate text-title text-fg">
            {thread
              ? threadHeading(
                  thread.subject,
                  thread.kind,
                  thread.motparter ?? [],
                  navn.data,
                  me.data?.userId,
                )
              : 'Samtale'}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Kanalen står i HODET, ikke nede ved svarfeltet: den skal være
                lest før man begynner å skrive, ikke etterpå. */}
            {thread && (
              <KanalLinje traad={tilKanal(thread.channel)} siste={tilKanal(thread.sisteKanal)} />
            )}
            {thread && (
              <span
                className={`inline-flex h-badge items-center rounded-badge px-2 font-medium text-[11px] ${KIND_TONE[thread.kind] ?? 'bg-surface-2 text-fg-muted'}`}
              >
                {KIND_LABEL[thread.kind] ?? thread.kind}
              </span>
            )}
            <span className="text-[12px] text-fg-muted">{rows.length} meldinger</span>
            {/* Med emne står motpartene ellers ingen steder — og «hvem snakker
                jeg med» er halve spørsmålet når du åpner en tråd. */}
            {thread?.subject?.trim() && (thread.motparter?.length ?? 0) > 0 && (
              <span className="min-w-0 truncate text-[12px] text-fg-muted">
                ·{' '}
                {threadHeading(
                  null,
                  thread.kind,
                  thread.motparter ?? [],
                  navn.data,
                  me.data?.userId,
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* [ART50-UI] F6-05 — brukeren skal vite NÅR det skifter fra maskin til
          menneske. Teksten er lovtekst; plasseringen (i tråden, over meldingene
          som kom etter) er design. */}
      {escalated && (
        <div className="flex flex-col gap-2">
          <HumanHandoverNotice className="rounded-control bg-warn-soft text-body" />
          <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <Sparkles size={14} className="shrink-0 text-warn" />
            Assistenten står fortsatt i tråden. Historikken over er konteksten din — kunden skal
            ikke måtte gjenta seg.
          </p>
        </div>
      )}

      {/* Meldingene */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-bg p-4">
        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <MessageSquare size={24} className="text-fg-muted" />
            <p className="text-body text-fg-muted">Ingen meldinger i tråden ennå.</p>
          </div>
        ) : (
          rows.map((m, i) => {
            const prev = rows[i - 1];
            const newDay =
              !prev ||
              new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const mine = m.authorId === me.data?.userId;
            return (
              <div key={m.id} className="flex flex-col gap-3">
                {newDay && (
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[12px] text-fg-muted">{fmtDayHeading(m.createdAt)}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <Message
                  mine={mine}
                  agent={isAgent(m.authorId)}
                  author={authorLabel(m.authorId, me.data?.userId, navn.data)}
                  rolle={navn.data?.[m.authorId]?.rolle}
                  authorId={m.authorId}
                  body={m.body}
                  at={m.createdAt}
                  kanal={tilKanal(m.channel)}
                  utenfor={m.direction === 'inbound'}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Svarfelt. StatefulButton fordi dette ENDRER tilstand (UI-PAKKER §3). */}
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(e);
          }}
          rows={2}
          maxLength={4000}
          placeholder="Skriv et svar … (⌘/Ctrl + Enter sender)"
          aria-label="Svar i tråden"
          className="min-h-[56px] flex-1 resize-y rounded-control border border-border bg-bg px-3 py-2 text-body text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
        />
        <StatefulButton
          type="submit"
          state={post.isPending ? 'loading' : post.isError ? 'error' : 'idle'}
          loadingText="Sender…"
          successText="Sendt"
          errorText="Feilet"
          disabled={!body.trim()}
        >
          Send
        </StatefulButton>
      </form>
      {post.isError && <p className="text-[12px] text-danger">{post.error.message}</p>}
    </div>
  );
}

/**
 * Én melding.
 *
 * ⚠️ 03.08.2026: `DitherAvatar` fjernet (dither-kit ut av UI-et). Andre
 * deltakere får nå det samme nøytrale profil-ikonet som sidebaren bruker.
 *
 * Det kostet oss noe ekte: dither-avataren var **stabil per deltaker-ID**, så
 * øyet kunne skille to mennesker fra hverandre uten navn. Løst 08.08.2026 med
 * `directory.participants` — nå står navnet der, og initialene i avataren.
 *
 * ── Kanal per melding (08.08.2026) ────────────────────────────────────────
 * `kanal` vises som et merke ved siden av navnet — men KUN når den ikke er
 * `app`. En app-melding i en app-tråd er normaltilstanden, og et merke på hver
 * eneste rad hadde gjort merket usynlig nettopp der det betyr noe.
 */
function Message({
  mine,
  agent,
  author,
  rolle,
  authorId,
  body,
  at,
  kanal,
  utenfor,
}: {
  mine: boolean;
  agent: boolean;
  author: string;
  rolle?: 'ansatt' | 'mekaniker' | 'kunde';
  authorId: string;
  /** Hvor meldingen kom inn / gikk ut. */
  kanal: Kanal;
  /** `direction === 'inbound'` — den kom UTENFRA, ikke fra oss. */
  utenfor: boolean;
  body: string;
  at: Date | string;
}) {
  // Initialer er stabile per PERSON, ikke per ID — det er nettopp det den gamle
  // dither-avataren gjorde, bare uten at man kunne lese hvem det var.
  const initialer = rolle
    ? author
        .split(/\s+/)
        .slice(0, 2)
        .map((d) => d[0])
        .join('')
        .toUpperCase()
    : null;

  return (
    <div className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
      <span className="mt-0.5 shrink-0">
        {agent ? (
          <span
            className="grid size-7 place-items-center rounded-control bg-warn-soft text-warn"
            title={`Agent: ${agentName(authorId)}`}
          >
            <Sparkles size={16} />
          </span>
        ) : mine ? (
          <span className="grid size-7 place-items-center rounded-control bg-accent-soft font-medium text-[11px] text-accent-strong">
            Du
          </span>
        ) : initialer ? (
          <span
            title={author}
            className="grid size-7 place-items-center rounded-control bg-surface-2 font-medium text-[11px] text-fg-muted"
          >
            {initialer}
          </span>
        ) : (
          <span className="grid size-7 place-items-center rounded-control bg-surface-2 text-fg-muted">
            <CircleUser size={16} />
          </span>
        )}
      </span>
      <div className={`flex min-w-0 max-w-[78%] flex-col gap-1 ${mine ? 'items-end' : ''}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] text-fg-muted">{author}</span>
          {/* Rollen står bare på andre enn deg selv: «Kunde» eller «Mekaniker»
              endrer hvordan svaret skal formuleres. */}
          {rolle && !mine && (
            <span className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted">
              {ROLLE_LABEL[rolle] ?? rolle}
            </span>
          )}
          {/* Bare når kanalen er noe ANNET enn app — se doc over. */}
          {kanal !== 'app' && <KanalMerke kanal={kanal} />}
          <span className="text-[12px] text-fg-muted tabular-nums">{fmtTime(at)}</span>
        </div>
        {/* ⚠️ Innkommende meldinger fra en EKSTERN kanal får en tydelig venstre
            kant. En e-post kunden sendte til forhandlerens postkasse er ikke
            det samme som en linje noen skrev i panelet, og forskjellen skal
            være synlig uten å lese merket. */}
        <p
          className={`whitespace-pre-wrap break-words rounded-control px-3 py-2 text-body text-fg ${
            mine
              ? 'bg-accent-soft'
              : agent
                ? 'border border-warn/20 bg-warn-soft'
                : 'border border-border bg-surface-2'
          } ${utenfor && kanal !== 'app' ? 'border-l-2 border-l-fg-muted' : ''}`}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
