'use client';

import {
  Avatar,
  type AvatarValg,
  CircleAlert,
  CircleUser,
  HumanHandoverNotice,
  MessageSquare,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  RefreshCw,
  Sparkles,
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
  type DeltakerRolle,
  fmtDayHeading,
  fmtTime,
  forsteMotpartNavn,
  forsteMotpartRolle,
  isAgent,
  KIND_LABEL,
  KIND_TONE,
  type Navnekart,
  ROLLE_LABEL,
  supportRolleEtikett,
  supportTradTittel,
  threadHeading,
  tilDeltakerRolle,
  visningForTraadtype,
} from '../_lib';
import { useInboxModus } from '../_modus';

/**
 * Tråden. F6-05 — overtakelsen fra AI, i samme tråd.
 * Det som gjør eskaleringen synlig her er ikke en egen «eskalert»-kolonne, men
 * at agenten skrev en systemmelding i tråden da den ga slipp (`escalateToHuman`).
 * Historikken over den er kontekst for mennesket som overtar — derfor vises hele
 * samtalen, ikke bare det som skjedde etter overtakelsen.
 * `markRead` kjøres når tråden åpnes og når det kommer nye meldinger mens den
 * står åpen. Uten det andre kallet ville uleste-telleren vokst mens brukeren
 * satt og så på meldingene.
 */
export default function TrådPage() {
  const params = useParams<{ id: string }>();
  const threadId = params.id;
  const utils = trpc.useUtils();
  const lyd = useLyd();
  const modus = useInboxModus();
  const endwise = modus === 'endwise';

  const me = trpc.session.me.useQuery();
  const dealerThreads = trpc.messages.listThreads.useQuery(undefined, { enabled: !endwise });
  const platformThreads = trpc.messages.listPlatformSupport.useQuery(undefined, {
    enabled: endwise,
    retry: false,
  });
  const dealerMessages = trpc.messages.listMessages.useQuery({ threadId }, { enabled: !endwise });
  const platformMessages = trpc.messages.listPlatformSupportMessages.useQuery(
    { threadId },
    { enabled: endwise, retry: false },
  );
  const threads = endwise ? platformThreads : dealerThreads;
  const messages = endwise ? platformMessages : dealerMessages;

  const [justEscalated, setJustEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markReadDealer = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.listThreads.invalidate(),
  });
  const markReadPlatform = trpc.messages.markPlatformSupportRead.useMutation({
    onSuccess: () => utils.messages.listPlatformSupport.invalidate(),
  });
  const markRead = endwise ? markReadPlatform : markReadDealer;
  /**
   * Send en melding som ikke gikk fram, på nytt.
   * Serveren avviser en melding som allerede står som `sent`, så et
   * dobbeltklikk her kan ikke bli to e-poster hos kunden. Knappen er likevel
   * deaktivert mens den går — ikke for sikkerhets skyld, men fordi en knapp som
   * ikke reagerer på trykk ser ødelagt ut.
   */
  const resend = trpc.messages.resend.useMutation({
    onSuccess: () => utils.messages.listMessages.invalidate({ threadId }),
  });
  const postDealer = trpc.messages.post.useMutation({
    onSuccess: () => {
      utils.messages.listMessages.invalidate({ threadId });
      utils.messages.listThreads.invalidate();
      lyd.sendt();
    },
    onError: () => lyd.feil(),
  });
  const postPlatform = trpc.messages.postPlatformSupport.useMutation({
    onSuccess: () => {
      utils.messages.listPlatformSupportMessages.invalidate({ threadId });
      utils.messages.listPlatformSupport.invalidate();
      lyd.sendt();
    },
    onError: () => lyd.feil(),
  });
  const post = endwise ? postPlatform : postDealer;

  const thread = (threads.data ?? []).find((t) => t.id === threadId);
  const rows = useMemo(() => messages.data ?? [], [messages.data]);

  /**
   * Navn på alle som har skrevet, pluss alle som er i tråden.
   * Begge kilder trengs: en deltaker som ennå ikke har skrevet skal likevel
   * kunne navngi tråden, og en forfatter som siden er tatt ut av tråden skal
   * ikke miste navnet sitt bakover i historikken.
   */
  const motparter = thread && 'motparter' in thread ? (thread.motparter ?? []) : [];
  const deltakerIder = useMemo(() => {
    const alle = [...rows.map((m) => m.authorId), ...motparter];
    return [...new Set(alle)].filter((id) => id && !isAgent(id));
  }, [rows, motparter]);

  /**
   * Kallenavn kun i interne tråder. Én tråd på skjermen = én visning, så her
   * er det enkelt: kundetråder får `offisiell`, og da ser serveren aldri engang
   * etter et kallenavn.
   * Fram til tråden er lastet står visningen på `offisiell` — å defaulte til
   * `intern` mens vi venter ville betydd at et kallenavn kunne blinke innom i
   * en kundetråd før riktig svar kom.
   */
  const visning = thread ? visningForTraadtype(thread.kind) : 'offisiell';

  const navn = trpc.directory.participants.useQuery(
    { ids: deltakerIder, visning },
    { enabled: !endwise && deltakerIder.length > 0, staleTime: 5 * 60_000 },
  );

  const meldingNavn = useMemo(() => {
    const kart: Navnekart = {};
    for (const m of rows) {
      if ('authorNavn' in m && typeof m.authorNavn === 'string' && m.authorNavn.trim()) {
        const rolle =
          'authorRolle' in m && typeof m.authorRolle === 'string' ? m.authorRolle : null;
        kart[m.authorId] = { navn: m.authorNavn, rolle: tilDeltakerRolle(rolle) };
      }
    }
    if (thread && 'kontaktNavn' in thread && thread.kontaktNavn) {
      const id = 'motparter' in thread ? thread.motparter?.[0] : undefined;
      const rolle =
        thread && 'kontaktRolle' in thread && typeof thread.kontaktRolle === 'string'
          ? thread.kontaktRolle
          : null;
      if (id && !kart[id]) {
        kart[id] = { navn: thread.kontaktNavn, rolle: tilDeltakerRolle(rolle) };
      }
    }
    return kart;
  }, [rows, thread]);

  const navnKart = { ...(navn.data ?? {}), ...meldingNavn };

  // Sanntid: bare for denne tråden. Eventet er varselklokka; innholdet hentes
  // gjennom tRPC (og dermed RLS).
  const onStreamEvent = useCallback(
    (event: { type: string; subjectId: string | null }) => {
      if (event.subjectId !== threadId) return;
      if (event.type === 'message.created') {
        if (endwise) void utils.messages.listPlatformSupportMessages.invalidate({ threadId });
        else void utils.messages.listMessages.invalidate({ threadId });
      }
      if (event.type === 'thread.escalated') {
        setJustEscalated(true);
        if (endwise) void utils.messages.listPlatformSupportMessages.invalidate({ threadId });
        else void utils.messages.listMessages.invalidate({ threadId });
      }
    },
    [threadId, utils, endwise],
  );
  // Sanntid kjører fortsatt — men uten statuspille. Eiers beslutning
  // statusmerker («Sanntid», «Live», «Aktive») er pynt som
  // konkurrerer med innholdet. Strømmen skal merkes ved at ting dukker opp,
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

  function onPrompt(melding: PromptInputMessage, event: FormEvent<HTMLFormElement>) {
    const text = melding.text.trim();
    if (!text) return;
    post.mutate({ threadId, body: text }, { onSuccess: () => event.currentTarget.reset() });
  }

  const motpartId =
    thread && 'motparter' in thread
      ? thread.motparter?.find((id: string) => id && id !== me.data?.userId)
      : undefined;
  const tradRolle =
    thread && 'kontaktRolle' in thread && typeof thread.kontaktRolle === 'string'
      ? thread.kontaktRolle
      : thread && thread.kind === 'dealer_admin' && 'motparter' in thread
        ? forsteMotpartRolle(thread.motparter ?? [], navnKart, me.data?.userId)
        : motpartId
          ? navnKart?.[motpartId]?.rolle
          : undefined;
  const tradRolleEtikett = thread?.kind === 'dealer_admin' ? supportRolleEtikett(tradRolle) : null;

  const tradTittel =
    endwise && thread && 'kontaktNavn' in thread
      ? supportTradTittel(thread.kontaktNavn, tradRolle)
      : thread && thread.kind === 'dealer_admin' && 'motparter' in thread
        ? supportTradTittel(
            forsteMotpartNavn(thread.motparter ?? [], navnKart, me.data?.userId),
            tradRolle,
          )
        : thread && 'motparter' in thread
          ? threadHeading(
              thread.subject,
              thread.kind,
              thread.motparter ?? [],
              navnKart,
              me.data?.userId,
            )
          : 'Samtale';

  if (messages.isLoading) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster tråd …</div>;
  }
  if (messages.isError) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-8 py-7">
        <CardShell className="p-6">
          <p className="text-body text-danger">Kunne ikke åpne tråden: {messages.error.message}</p>
          <Link
            href={(endwise ? '/endwise/innboks' : '/innboks') as Route}
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
          {/**
           * «← Meldinger» sto her fram til og er fjernet.
           * Innboksen har tre kolonner, og `layout.tsx` holder samtalelista
           * Montert på tvers av trådbytter. Lista står altså allerede til
           * venstre mens du leser tråden. En knapp som «tar deg tilbake» til
           * noe du aldri forlot, er ikke navigasjon — den er en påstand om at
           * du er et annet sted enn du er.
           */}
          <h1 className="truncate text-title text-fg">{tradTittel}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/*
             * Kanalen står i hodet, ikke nede ved svarfeltet: den skal være
             * lest før man begynner å skrive, ikke etterpå.
             */}
            {thread && (
              <KanalLinje
                traad={tilKanal(thread.channel)}
                siste={tilKanal('sisteKanal' in thread ? thread.sisteKanal : thread.channel)}
              />
            )}
            {thread && (
              <span
                className={`inline-flex h-badge items-center rounded-badge px-2 font-medium text-[11px] ${
                  tradRolleEtikett
                    ? 'bg-surface-2 text-fg-muted'
                    : (KIND_TONE[thread.kind] ?? 'bg-surface-2 text-fg-muted')
                }`}
              >
                {tradRolleEtikett ?? KIND_LABEL[thread.kind] ?? thread.kind}
              </span>
            )}
            <span className="text-[12px] text-fg-muted">{rows.length} meldinger</span>
            {/*
             * Med emne står motpartene ellers ingen steder — og «hvem snakker
             * jeg med» er halve spørsmålet når du åpner en tråd.
             */}
            {thread && 'motparter' in thread && thread.subject?.trim() && motparter.length > 0 && (
              <span className="min-w-0 truncate text-[12px] text-fg-muted">
                · {threadHeading(null, thread.kind, motparter, navnKart, me.data?.userId)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/*
       * [ART50-UI] F6-05 — brukeren skal vite når det skifter fra maskin til
       * menneske. Teksten er lovtekst; plasseringen (i tråden, over meldingene
       * som kom etter) er design.
       */}
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
                  author={authorLabel(m.authorId, me.data?.userId, navnKart)}
                  rolle={navnKart?.[m.authorId]?.rolle}
                  rolleEtikett={
                    supportRolleEtikett(navnKart?.[m.authorId]?.rolle) ??
                    (navnKart?.[m.authorId]?.rolle === 'mekaniker' ||
                    navnKart?.[m.authorId]?.rolle === 'kunde'
                      ? (ROLLE_LABEL[navnKart[m.authorId]?.rolle ?? ''] ?? null)
                      : null)
                  }
                  authorId={m.authorId}
                  seed={navn.data?.[m.authorId]?.seed ?? null}
                  avatar={navn.data?.[m.authorId]?.avatar ?? null}
                  body={m.body}
                  at={m.createdAt}
                  kanal={tilKanal(m.channel)}
                  utenfor={m.direction === 'inbound'}
                  levering={m.deliveryStatus}
                  leveringsfeil={m.deliveryError}
                  paaNytt={
                    m.deliveryStatus === 'failed'
                      ? () => resend.mutate({ messageId: m.id })
                      : undefined
                  }
                  sender={resend.isPending && resend.variables?.messageId === m.id}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <PromptInput
        onSubmit={onPrompt}
        className="border-0 bg-transparent shadow-none"
        aria-label="Svar i tråden"
      >
        <PromptInputBody className="min-w-0 flex-1">
          <PromptInputTextarea
            placeholder="Skriv et svar …"
            maxLength={4000}
            disabled={post.isPending}
            className="bg-transparent text-[16px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/45 md:text-label"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit
            status={post.isPending ? 'submitted' : post.isError ? 'error' : 'ready'}
          />
        </PromptInputFooter>
      </PromptInput>
      {post.isError && <p className="text-[12px] text-danger">{post.error.message}</p>}
    </div>
  );
}

/**
 * Én melding.
 * `DitherAvatar` fjernet (dither-kit ut av UI-et). Andre
 * deltakere får nå det samme nøytrale profil-ikonet som sidebaren bruker.
 * Det kostet oss noe ekte: dither-avataren var **stabil per deltaker-ID**, så
 * øyet kunne skille to mennesker fra hverandre uten navn. Løst med
 * `directory.participants` — nå står navnet der, og initialene i avataren.
 * Kanal per melding
 * `kanal` vises som et merke ved siden av navnet — men kun når den ikke er
 * `app`. En app-melding i en app-tråd er normaltilstanden, og et merke på hver
 * eneste rad hadde gjort merket usynlig nettopp der det betyr noe.
 */
function Message({
  mine,
  agent,
  author,
  rolle,
  rolleEtikett,
  authorId,
  seed,
  avatar,
  body,
  at,
  kanal,
  utenfor,
  levering,
  leveringsfeil,
  paaNytt,
  sender,
}: {
  mine: boolean;
  agent: boolean;
  author: string;
  rolle?: DeltakerRolle;
  /** Vist merke. Tom = ingen rolle (aldri «Ansatt»). */
  rolleEtikett?: string | null;
  authorId: string;
  /** Hvor meldingen kom inn / gikk ut. */
  kanal: Kanal;
  /**
   * Seeden til avataren — fra serveren, ikke `authorId`. Null når vi ikke
   * kjenner personen; da tegnes det nøytrale ikonet, ikke et gjettet ansikt.
   */
  seed: string | null;
  avatar: AvatarValg | null;
  /** `direction 'inbound'` — den kom utenfra, ikke fra oss. */
  utenfor: boolean;
  body: string;
  at: Date | string;
  /** Leveringsstatus for ekstern kanal. `null` = ingen levering gjelder. */
  levering: 'pending' | 'sending' | 'sent' | 'failed' | null;
  leveringsfeil: string | null;
  /** Satt kun når meldingen kan sendes på nytt, altså når den har feilet. */
  paaNytt?: () => void;
  sender: boolean;
}) {
  /**
   * Initialene er borte, avataren er tilbake.
   * Fram til sto det to bokstaver her. De var lesbare, men to
   * mekanikere som begge forkortes «mh» fikk nøyaktig samme rute — og da bærer
   * ruta ingen informasjon. Blobatar gir formen tilbake, og navnet står
   * fortsatt rett ved siden av, så lesbarheten vi vant i august er i behold.
   * Krever begge deler: en rolle (personen hører til tenanten) og en seed
   * fra serveren. Mangler én av dem, er det nøytrale ikonet riktig svar.
   */
  const kjent = Boolean(rolle && seed);

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
        ) : kjent && seed ? (
          /*
           * `hover` og ikke `alltid`: en tråd har mange meldinger, og
           * tretti ansikter som puster samtidig er nettopp den veggen av
           * bevegelse biblioteket selv advarer mot. Amplituden er 0 til du
           * peker — da rører ett ansikt seg.
           * Vanlig JS-kommentar, ikke {/* … *​/}: vi står i en ternær
           * uttrykksposisjon, ikke blant JSX-barn.
           */
          <Avatar seed={seed} valg={avatar} navn={author} size={28} bevegelse="hover" />
        ) : (
          <span className="grid size-7 place-items-center rounded-control bg-surface-2 text-fg-muted">
            <CircleUser size={16} />
          </span>
        )}
      </span>
      <div className={`flex min-w-0 max-w-[78%] flex-col gap-1 ${mine ? 'items-end' : ''}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] text-fg-muted">{author}</span>
          {/*
           * Rollen står bare på andre enn deg selv: «Kunde» eller «Mekaniker»
           * endrer hvordan svaret skal formuleres.
           */}
          {rolleEtikett && (
            <span className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted">
              {rolleEtikett}
            </span>
          )}
          {/* Bare når kanalen er noe annet enn app — se doc over. */}
          {kanal !== 'app' && <KanalMerke kanal={kanal} />}
          <span className="text-[12px] text-fg-muted tabular-nums">{fmtTime(at)}</span>
        </div>
        {/*
         * Innkommende meldinger fra en ekstern kanal får en tydelig venstre
         * kant. En e-post kunden sendte til forhandlerens postkasse er ikke
         * det samme som en linje noen skrev i panelet, og forskjellen skal
         * være synlig uten å lese merket.
         */}
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

        {/**
         * Leveringsstatus.
         * Vises bevisst ikke når statusen er `sent`. Kanalmerket over sier
         * allerede at dette gikk på e-post, og en «Sendt»-hake på hver eneste
         * rad ville gjort den varselet under usynlig — det er nettopp den som
         * må fanges. Stillhet betyr «gikk fint»; alt annet får plass.
         */}
        {levering === 'failed' && (
          <div className="flex w-full flex-col gap-1.5 rounded-control border border-danger/25 bg-danger-soft px-2.5 py-2">
            <span className="flex items-start gap-1.5 text-[12px] text-danger">
              <CircleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>
                <b>Ikke levert.</b> Meldingen står i tråden, men e-posten gikk ikke ut.
                {leveringsfeil ? ` ${leveringsfeil}` : ''}
              </span>
            </span>
            {paaNytt && (
              <button
                type="button"
                onClick={paaNytt}
                disabled={sender}
                className="inline-flex h-7 w-fit items-center gap-1.5 rounded-control border border-danger/30 px-2 text-[12px] text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
              >
                <RefreshCw size={12} strokeWidth={1.75} className={sender ? 'animate-spin' : ''} />
                {sender ? 'Sender …' : 'Send på nytt'}
              </button>
            )}
          </div>
        )}
        {(levering === 'pending' || levering === 'sending') && (
          <span className="text-[12px] text-fg-muted">Sender e-post …</span>
        )}
      </div>
    </div>
  );
}
