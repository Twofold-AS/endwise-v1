'use client';

import { useChat } from '@ai-sdk/react';
import {
  AiDisclosure,
  Message,
  MessageBubble,
  MessageContent,
  MessageHeader,
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  ToolPart,
  ToolPartDetalj,
  ToolPartGodkjenning,
  type ToolPartStatus,
} from '@endwise/ui';
import { type ChatTransport, DefaultChatTransport, type UIMessage } from 'ai';
import { type FormEvent, useMemo, useState } from 'react';

/**
 * F6-18 — CHAT-FLATEN. Én komponent, to bruk: ekte agent og demo-strøm.
 *
 * ── ⛔ Ingen Vercel AI Gateway ───────────────────────────────────────────
 * `DefaultChatTransport` peker på `/chat/<agent>`, som rewrites til
 * `apps/api` (`next.config.ts`). Der velges modellen av agentens dataklasse:
 * AI-diagnose er `customer_freetext` ⇒ **Mistral, EU**. Klienten kan ikke be om
 * en annen modell — det finnes ikke et felt for det.
 *
 * ── Hvorfor tool-parts vises ─────────────────────────────────────────────
 * En agent som sier «jeg fant tre tjenester» uten å vise at den slo opp, ber om
 * tillit den ikke har gjort seg fortjent til. Hvert verktøykall rendres med
 * tilstanden sin, og feil blir SYNLIGE i stedet for å bli borte i en pen
 * formulering.
 *
 * ── De tre verktøyene, og hva de blir i UI-et ────────────────────────────
 *   `tjenester`      → `ToolPart` (oppslag, med utfoldbar innmat)
 *   `sporKunden`     → `Questionnaire` — agenten spør, løkka STOPPER til svar
 *   `noterDiagnose`  → `ToolPartGodkjenning` — ⛔ skriving krever et menneske
 *
 * ⚠️ Verktøynavnene er agent-spesifikke. `ETIKETTER` oversetter dem til norsk;
 * ukjente verktøy faller tilbake på sitt tekniske navn framfor å bli usynlige.
 * Et verktøykall vi ikke har oversatt skal se rart ut, ikke forsvinne.
 */

/**
 * Stabil React-nøkkel for én meldingsdel.
 *
 * Verktøydeler har `toolCallId`, som er stabil gjennom hele livsløpet
 * `input-streaming → … → output-available`. Bruker vi posisjonen i stedet, ville
 * React remountet godkjenn-panelet hver gang en tilstand endret seg — altså
 * nullstilt det midt i at noen holder på å svare på det.
 *
 * Tekstdeler har ingen ID. De er til gjengjeld stabile i rekkefølge innenfor én
 * melding, så posisjonen er riktig nøkkel der.
 */
function delNokkel(meldingId: string, del: { type: string }, i: number): string {
  const kall = (del as { toolCallId?: string }).toolCallId;
  return kall ? `${meldingId}-${kall}` : `${meldingId}-${del.type}-${i}`;
}

/** Tekniske verktøynavn → norsk etikett. Ukjente vises som de er. */
const ETIKETTER: Record<string, string> = {
  tjenester: 'Slår opp verkstedets tjenester',
  sporKunden: 'Stiller et oppklarende spørsmål',
  noterDiagnose: 'Skriver notat i saken',
  mineBookinger: 'Henter bookinger',
};

export interface AgentChatProps {
  /** Agentnavnet i registeret. Brukes til å bygge `/chat/<agent>`. */
  agent: string;
  /** Saken agenten kan skrive i. Uten den feiler skrive-verktøyet pent. */
  threadId?: string;
  /** Førstelinja fra assistenten, før brukeren har skrevet noe. */
  apning: string;
  /** Eksempler brukeren kan klikke på i stedet for å finne på noe selv. */
  forslag?: string[];
  /**
   * ⚠️ Kun for DEMO-flater: en ferdig transport fra `createChat()`. Er den satt,
   * går det ikke ett nettverkskall — og da MÅ `demo` også være satt, ellers
   * later flaten som om den er ekte.
   */
  transport?: ChatTransport<UIMessage>;
  startMeldinger?: UIMessage[];
  demo?: boolean;
}

export function AgentChat({
  agent,
  threadId,
  apning,
  forslag,
  transport,
  startMeldinger,
  demo = false,
}: AgentChatProps) {
  const [tekst, setTekst] = useState('');

  const valgtTransport = useMemo(
    () =>
      transport ??
      new DefaultChatTransport({
        api: `/chat/${agent}`,
        // Saken sendes med hver forespørsel. Serveren stoler ikke på den — den
        // brukes kun av verktøyet, som uansett sjekker deltakelse i tråden.
        body: threadId ? { threadId } : undefined,
        credentials: 'include',
      }),
    [transport, agent, threadId],
  );

  const { messages, sendMessage, status, error, addToolOutput, addToolApprovalResponse } = useChat({
    transport: valgtTransport,
    messages: startMeldinger,
  });

  const opptatt = status === 'submitted' || status === 'streaming';

  function send(innhold: string) {
    const rensket = innhold.trim();
    if (!rensket || opptatt) return;
    void sendMessage({ text: rensket });
    setTekst('');
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(tekst);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* [ART50-UI] AI Act art. 50. Gjelder også når det er en ansatt som
          snakker med maskinen — og i demoen, som ser helt ekte ut. */}
      <AiDisclosure />

      {demo ? (
        <p className="rounded-control border border-warn bg-warn-soft/40 px-3 py-2 text-body text-fg leading-relaxed">
          <strong>Eksempel, ikke i drift.</strong> Samtalen under er skrevet på forhånd og spilles
          av lokalt. Ingenting sendes til en modell, ingenting lagres, og ingen av handlingene
          utføres.
        </p>
      ) : null}

      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-[22rem] flex-1 rounded-xl border border-border bg-bg">
          <MessageScrollerViewport className="p-4">
            <MessageScrollerContent>
              <MessageScrollerItem>
                <Message align="start">
                  <MessageContent>
                    <MessageHeader>Assistent</MessageHeader>
                    <MessageBubble>{apning}</MessageBubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>

              {messages.map((melding) => (
                <MessageScrollerItem key={melding.id} messageId={melding.id} scrollAnchor>
                  <Message align={melding.role === 'user' ? 'end' : 'start'}>
                    <MessageContent>
                      <MessageHeader>{melding.role === 'user' ? 'Du' : 'Assistent'}</MessageHeader>
                      {melding.parts.map((del, i) => (
                        <Del
                          key={delNokkel(melding.id, del, i)}
                          del={del}
                          egen={melding.role === 'user'}
                          onSvar={addToolOutput}
                          onGodkjenn={addToolApprovalResponse}
                        />
                      ))}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}

              {error ? (
                <MessageScrollerItem>
                  <p className="rounded-control border border-destructive/40 px-3 py-2 text-body text-destructive">
                    Noe gikk galt: {error.message}
                  </p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {forslag && messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {forslag.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => send(f)}
              className="rounded-control border border-border px-3 py-1.5 text-left text-body text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {f}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Beskriv problemet …"
          disabled={opptatt}
          className="h-control min-w-0 flex-1 rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={opptatt || !tekst.trim()}
          className="inline-flex h-control shrink-0 items-center rounded-control bg-fg px-4 text-label text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {opptatt ? 'Sender …' : 'Send'}
        </button>
      </form>
    </div>
  );
}

/**
 * Én del av en melding. Tekst er tekst; alt som starter med `tool-` er et
 * verktøykall og rendres etter TILSTANDEN sin.
 */
function Del({
  del,
  egen,
  onSvar,
  onGodkjenn,
}: {
  del: UIMessage['parts'][number];
  egen: boolean;
  onSvar: ReturnType<typeof useChat>['addToolOutput'];
  onGodkjenn: ReturnType<typeof useChat>['addToolApprovalResponse'];
}) {
  if (del.type === 'text') {
    return <MessageBubble egen={egen}>{del.text}</MessageBubble>;
  }

  // `dynamic-tool` er verktøy uten statisk type. De skal vises, ikke skjules.
  const erVerktoy = del.type.startsWith('tool-') || del.type === 'dynamic-tool';
  if (!erVerktoy) return null;

  const p = del as unknown as {
    type: string;
    toolName?: string;
    toolCallId: string;
    state: ToolPartStatus;
    input?: Record<string, unknown>;
    output?: unknown;
    errorText?: string;
    approval?: { id: string; isAutomatic?: boolean };
  };

  const verktoy = p.toolName ?? p.type.replace(/^tool-/, '');
  const navn = ETIKETTER[verktoy] ?? verktoy;

  // ── ask_user: agenten spør, og løkka står stille til den får svar ───────
  if (verktoy === 'sporKunden' && p.state === 'input-available') {
    const sporsmal = String(p.input?.sporsmal ?? 'Kan du utdype?');
    const alternativer = Array.isArray(p.input?.alternativer)
      ? (p.input?.alternativer as string[])
      : [];

    return (
      <Questionnaire
        className="w-full max-w-[min(42rem,100%)] rounded-control border border-border bg-surface-2/60 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const svar = String(data.get('svar') ?? '').trim();
          if (!svar) return;
          onSvar({ tool: 'sporKunden', toolCallId: p.toolCallId, output: svar });
        }}
      >
        <QuestionnaireItem name="svar" required>
          <QuestionnaireTitle>{sporsmal}</QuestionnaireTitle>
          {alternativer.length > 0 ? (
            <QuestionnaireChoices>
              {alternativer.map((a) => (
                <QuestionnaireChoice key={a} value={a}>
                  {a}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
          ) : (
            <QuestionnaireInput placeholder="Skriv svaret ditt …" />
          )}
          <QuestionnaireActions>
            <QuestionnaireSubmit>Svar</QuestionnaireSubmit>
          </QuestionnaireActions>
        </QuestionnaireItem>
      </Questionnaire>
    );
  }

  // ── ⛔ Godkjenn før agenten skriver ────────────────────────────────────
  if (p.state === 'approval-requested' && p.approval && !p.approval.isAutomatic) {
    const id = p.approval.id;
    return (
      <ToolPart navn={navn} status={p.state}>
        <ToolPartGodkjenning
          sporsmal="Agenten vil skrive dette i saken. Godkjenner du?"
          onGodkjenn={() => onGodkjenn({ id, approved: true })}
          onAvvis={() => onGodkjenn({ id, approved: false })}
        />
        {p.input ? <ToolPartDetalj etikett="Vis hva som skrives" verdi={p.input} /> : null}
      </ToolPart>
    );
  }

  return (
    <ToolPart navn={navn} status={p.state}>
      {p.state === 'output-error' && p.errorText ? (
        <p className="text-body text-destructive">{p.errorText}</p>
      ) : null}
      {p.state === 'output-available' && p.output !== undefined ? (
        <ToolPartDetalj etikett="Vis resultat" verdi={p.output} />
      ) : null}
    </ToolPart>
  );
}
