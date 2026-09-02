'use client';

import { useChat } from '@ai-sdk/react';
import {
  Grainient,
  Message,
  MessageBubble,
  MessageContent,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@endwise/ui';
import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { DefaultChatTransport } from 'ai';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PHONE_KORT_FYLL, VERKSTED_INNHOLD } from '../_shell/phone-home';
import { erTillattGaaTil } from './gaa-til';
import { norskChatFeil } from './norsk-chat-feil';
import { RonnyHandtak, RonnyPil } from './ronny-ikoner';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;
const IDLE_MS = 5000;
const KORN_RAMME = 3;
const RAMME_PX = 18;
/** Apple HIG-kort: kort ease, ingen bounce/overshoot (ikke spring). */
const APPLE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const PANEL_OVERGANG = `height 200ms ${APPLE_EASE}, opacity 180ms ${APPLE_EASE}`;
const DRA_TAP_PX = 10;
const DRA_TERSKEL_PX = 36;
/** Peek under stripen: bare Ronnys siste svar, ikke samtalehøyde. */
const DOCK_KOMPAKT = '100%';
const DOCK_SAMTALE = 'auto';
const PEEK_MAX = 'min(36dvh, 16rem)';
/** Telefon-chat mindre enn desktop 17px body. */
const BOBLE_TEKST = 'text-[14px] leading-snug md:text-body md:leading-relaxed';

type RonnyVisning = 'stripe' | 'dock' | 'utvidet';

/**
 * Idle-syklus ~5s — også når panelet er åpent.
 * colere flere ganger. wink/burst så ansiktet beveger seg.
 * Ikke thinking her — tenking er kun submitted/streaming etter send.
 * Ikke triste / peureux / fatigue (triste, somnolent, blase, sleep).
 */
const RONNY_IDLE: readonly { expression: ExpressionId; state: StateId }[] = [
  { expression: 'colere', state: 'wink' },
  { expression: 'colere', state: 'burst' },
  { expression: 'surpris', state: 'wink' },
  { expression: 'colere', state: 'wink' },
  { expression: 'heureux', state: 'burst' },
  { expression: 'curieux', state: 'wink' },
  { expression: 'colere', state: 'wink' },
  { expression: 'attentif', state: 'wink' },
  { expression: 'excite', state: 'burst' },
  { expression: 'fier', state: 'wink' },
];

function useRonnyIdle(aktiv: boolean): (typeof RONNY_IDLE)[number] {
  const [steg, setSteg] = useState(0);
  useEffect(() => {
    if (!aktiv) return;
    const id = window.setInterval(() => {
      setSteg((s) => (s + 1) % RONNY_IDLE.length);
    }, IDLE_MS);
    return () => window.clearInterval(id);
  }, [aktiv]);
  return RONNY_IDLE[steg] ?? RONNY_IDLE[0];
}

function tekstFraMelding(melding: { parts: Array<{ type: string; text?: string }> }): string {
  return melding.parts
    .filter((del) => del.type === 'text')
    .map((del) => del.text ?? '')
    .join('');
}

/** Assistent-tekst i inneværende tur (etter siste bruker). Tom mens Ronny tenker. */
function sisteTurTekst(
  meldinger: Array<{ role: string; parts: Array<{ type: string; text?: string }> }>,
): string {
  for (let i = meldinger.length - 1; i >= 0; i--) {
    const melding = meldinger[i];
    if (!melding) continue;
    if (melding.role === 'user') return '';
    if (melding.role === 'assistant') {
      const tekst = tekstFraMelding(melding);
      if (tekst) return tekst;
    }
  }
  return '';
}

function RonnyTenkerTekst() {
  return (
    <p className={`ronny-tenker-tekst ${BOBLE_TEKST}`} data-ronny-tenker>
      Ronny tenker…
    </p>
  );
}

function gaaTilHref(del: { type: string; state?: string; output?: unknown }): string | null {
  // Alias: Mistral får `gaaTil`; eldre/UI-matcher kan fortsatt se `gåTil`.
  if (!del.type.includes('gåTil') && !del.type.includes('gaaTil')) return null;
  if (del.state !== 'output-available') return null;
  const out = del.output as { ok?: boolean; href?: string } | undefined;
  if (!out?.ok || !out.href) return null;
  return out.href;
}

function skallHoyde(visning: RonnyVisning, visPeek: boolean): string {
  if (visning === 'stripe') return '100%';
  if (visning === 'utvidet') return '100%';
  if (visPeek) return DOCK_SAMTALE;
  return DOCK_KOMPAKT;
}

/**
 * Stripe, peek og full logg: 18px radius oppe og nede. Stripe-tap åpner
 * sticky Grainient-composer nederst (overlay). Send: peek under stripen
 * med bare Ronnys svar. Horisontal strek (tap/dra) åpner full logg.
 * Full-åpen composer sitter på panelet uten eget Grainient.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const [visning, setVisning] = useState<RonnyVisning>('stripe');
  const [klikk, setKlikk] = useState(false);
  const [suksess, setSuksess] = useState(false);
  const [foldet, setFoldet] = useState(false);
  const [promptTekst, setPromptTekst] = useState('');
  const [ankerTop, setAnkerTop] = useState(0);
  const [composerHoyde, setComposerHoyde] = useState(88);
  const spinTimer = useRef<number | null>(null);
  const ankerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const draStartY = useRef<number | null>(null);
  const sisteGaaTil = useRef<string>('');
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);
  const apen = visning !== 'stripe';
  const utvidet = visning === 'utvidet';

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/chat/workshop',
        credentials: 'include',
        body: { side },
      }),
    [side],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const ronnySvar = sisteTurTekst(messages);
  const visPeek = visning === 'dock' && (Boolean(ronnySvar) || Boolean(error) || foldet);
  const visDockInnhold = visPeek || utvidet;
  const fastHoyde = visning === 'utvidet';
  const visHandtak = visPeek || utvidet;
  const opptatt = status === 'submitted' || status === 'streaming';
  const visTenker = opptatt && !error && !ronnySvar;
  const idle = useRonnyIdle(!klikk);

  useEffect(() => {
    const onSuksess = () => {
      setSuksess(true);
      window.setTimeout(() => setSuksess(false), 1800);
    };
    window.addEventListener('endwise:booking-lagret', onSuksess);
    return () => window.removeEventListener('endwise:booking-lagret', onSuksess);
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mål på nytt når composer/peek vises
  useLayoutEffect(() => {
    function maal() {
      const el = ankerRef.current;
      if (!el) return;
      setAnkerTop(el.getBoundingClientRect().top);
      const composer = composerRef.current;
      if (composer) setComposerHoyde(composer.getBoundingClientRect().height);
    }
    maal();
    window.addEventListener('resize', maal);
    return () => window.removeEventListener('resize', maal);
  }, [apen, promptTekst, visPeek, utvidet]);

  useEffect(() => {
    if (!apen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setVisning((v) => (v === 'utvidet' ? 'dock' : 'stripe'));
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [apen]);

  useEffect(() => {
    for (const melding of messages) {
      for (const del of melding.parts) {
        const href = gaaTilHref(del as { type: string; state?: string; output?: unknown });
        if (!href || !erTillattGaaTil(href) || sisteGaaTil.current === href) continue;
        sisteGaaTil.current = href;
        router.push(href as never);
      }
    }
  }, [messages, router]);

  const tilstand: StateId = klikk
    ? 'idle'
    : suksess
      ? 'burst'
      : error
        ? 'alert'
        : opptatt
          ? 'thinking'
          : idle.state;
  const uttrykk: ExpressionId = klikk ? 'surpris' : idle.expression;

  function send(innhold: string) {
    const rensket = innhold.trim();
    if (!rensket || opptatt) return;
    setFoldet(true);
    setPromptTekst('');
    void sendMessage({ text: rensket });
  }

  function onPrompt(melding: PromptInputMessage) {
    send(melding.text);
  }

  function lukk() {
    setVisning('stripe');
    setKlikk(false);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }

  function onRonny() {
    if (apen) {
      lukk();
      return;
    }
    setKlikk(true);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
    spinTimer.current = window.setTimeout(() => {
      setKlikk(false);
      setVisning('dock');
    }, SPIN_MS);
  }

  function onTekstEllerPil() {
    if (apen) {
      lukk();
      return;
    }
    setKlikk(false);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
    setVisning('dock');
  }

  function onUtvid() {
    setVisning((v) => (v === 'utvidet' ? 'dock' : 'utvidet'));
  }

  function onHandtakNed(e: ReactPointerEvent<HTMLButtonElement>) {
    draStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandtakOpp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (draStartY.current == null) return;
    const dy = e.clientY - draStartY.current;
    draStartY.current = null;
    if (Math.abs(dy) < DRA_TAP_PX) {
      onUtvid();
      return;
    }
    if (dy > DRA_TERSKEL_PX) setVisning('utvidet');
    else if (dy < -DRA_TERSKEL_PX) setVisning('dock');
  }

  if (pathname.startsWith('/oppstart')) return null;

  const submitStatus = opptatt ? status : 'ready';

  return (
    <>
      <div
        ref={ankerRef}
        className="relative z-40 h-11 max-h-[44px] shrink-0 md:h-control md:max-h-[32px]"
      >
        <div
          data-ronny-verksted-bredde
          className={
            utvidet
              ? `fixed right-0 bottom-0 left-0 z-[60] ${VERKSTED_INNHOLD}`
              : `absolute inset-x-0 top-0 z-40 ${VERKSTED_INNHOLD}`
          }
          style={utvidet ? { top: ankerTop } : undefined}
        >
          <div
            data-workshop-shell
            data-ronny-overlay={utvidet ? '' : undefined}
            className="overflow-hidden rounded-[18px] shadow-none"
            style={
              utvidet
                ? { height: '100%', borderRadius: RAMME_PX }
                : {
                    height: skallHoyde(visning, visPeek),
                    borderRadius: RAMME_PX,
                    transition: PANEL_OVERGANG,
                  }
            }
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Grainient className="absolute inset-0 h-full w-full" />
            </div>

            <div className={`relative flex flex-col ${fastHoyde || utvidet ? 'h-full' : ''}`}>
              <div
                data-workshop-strip
                className="relative h-11 max-h-[44px] w-full shrink-0 md:h-control md:max-h-[32px]"
              >
                <div
                  data-workshop-cluster
                  className="absolute inset-0 z-10 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    onClick={onRonny}
                    aria-expanded={apen}
                    aria-label={apen ? 'Lukk KI-Ronny' : 'Åpne KI-Ronny'}
                    data-workshop-sticky
                    data-ronny-stage
                    className="flex shrink-0 items-center justify-center self-center bg-transparent focus-visible:outline-2 focus-visible:outline-white"
                    style={{ width: STRIP_BOT, height: STRIP_BOT }}
                  >
                    <span data-ronny-spin={klikk ? '' : undefined} className="flex">
                      <BloubBot
                        size={STRIP_BOT}
                        shape="cercle"
                        color="#ffffff"
                        paper="#111111"
                        state={tilstand}
                        expression={uttrykk}
                        follow={false}
                        still={false}
                        playing={false}
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onTekstEllerPil}
                    aria-expanded={apen}
                    className="flex min-w-0 items-center gap-1.5 bg-transparent text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className="truncate leading-none text-label text-white">
                      La KI-Ronny ta styringen
                    </span>
                    <RonnyPil size={14} opp={apen} />
                  </button>
                </div>
              </div>

              <div
                data-workshop-dock
                data-ronny-visning={visning}
                data-ronny-peek={visPeek ? '' : undefined}
                className="grid min-h-0 flex-1 transition-[grid-template-rows] duration-200"
                style={{
                  gridTemplateRows: visDockInnhold
                    ? fastHoyde || utvidet
                      ? '1fr'
                      : 'auto'
                    : '0fr',
                  transitionTimingFunction: APPLE_EASE,
                }}
                role="dialog"
                aria-label="KI-Ronny"
                aria-hidden={!visDockInnhold}
              >
                <div
                  data-ronny-ramme
                  className={`flex min-h-0 flex-col overflow-hidden ${fastHoyde || utvidet ? 'h-full' : ''}`}
                  style={
                    visDockInnhold
                      ? {
                          paddingLeft: KORN_RAMME,
                          paddingRight: KORN_RAMME,
                          paddingBottom: KORN_RAMME,
                        }
                      : undefined
                  }
                >
                  <div
                    data-ronny-kort-padding
                    className={`w-full px-3 ${
                      fastHoyde || utvidet ? 'flex min-h-0 flex-1 flex-col' : ''
                    } ${visDockInnhold ? 'opacity-100' : 'opacity-0'} pt-1 transition-opacity duration-200`}
                    style={{ transitionTimingFunction: APPLE_EASE }}
                  >
                    <div
                      data-ronny-svar-kort
                      className={`flex flex-col overflow-hidden bg-transparent px-3 pt-0.5 pb-0 text-[#1d1d1f] ${
                        fastHoyde || utvidet ? 'h-full min-h-0 flex-1' : ''
                      }`}
                      style={{
                        maxHeight: visPeek ? PEEK_MAX : undefined,
                        paddingBottom: utvidet ? composerHoyde : undefined,
                      }}
                    >
                      {utvidet ? (
                        <div
                          data-ronny-traad
                          className="no-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-1 pb-0 md:gap-5"
                        >
                          {messages.map((melding) => {
                            const tekstDel = tekstFraMelding(melding);
                            if (!tekstDel) return null;
                            return (
                              <Message
                                key={melding.id}
                                align={melding.role === 'user' ? 'end' : 'start'}
                              >
                                <MessageContent>
                                  <MessageBubble
                                    egen={melding.role === 'user'}
                                    className={BOBLE_TEKST}
                                  >
                                    {tekstDel}
                                  </MessageBubble>
                                </MessageContent>
                              </Message>
                            );
                          })}
                          {error ? (
                            <Message align="start">
                              <MessageContent>
                                <MessageBubble className={BOBLE_TEKST}>
                                  {norskChatFeil(error)}
                                </MessageBubble>
                              </MessageContent>
                            </Message>
                          ) : visTenker ? (
                            <RonnyTenkerTekst />
                          ) : null}
                        </div>
                      ) : visPeek ? (
                        <div
                          data-ronny-traad
                          data-ronny-peek-svar
                          className="no-scrollbar min-h-0 overflow-y-auto py-0"
                        >
                          {ronnySvar ? (
                            <Message align="start">
                              <MessageContent>
                                <MessageBubble className={BOBLE_TEKST}>{ronnySvar}</MessageBubble>
                              </MessageContent>
                            </Message>
                          ) : error ? (
                            <Message align="start">
                              <MessageContent>
                                <MessageBubble className={BOBLE_TEKST}>
                                  {norskChatFeil(error)}
                                </MessageBubble>
                              </MessageContent>
                            </Message>
                          ) : visTenker ? (
                            <RonnyTenkerTekst />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {visHandtak ? (
                    <div data-ronny-handtak-rad className="flex justify-center pt-0 pb-1">
                      <button
                        type="button"
                        data-ronny-utvid
                        data-ronny-handtak
                        aria-label={utvidet ? 'Lukk samtale' : 'Se hele'}
                        title={utvidet ? 'Lukk samtale' : 'Se hele'}
                        aria-expanded={utvidet}
                        onPointerDown={onHandtakNed}
                        onPointerUp={onHandtakOpp}
                        className="flex cursor-grab touch-none items-center justify-center px-6 py-0.5 active:cursor-grabbing"
                      >
                        <RonnyHandtak />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {apen ? (
        <div
          ref={composerRef}
          data-ronny-composer
          className="fixed inset-x-0 bottom-0 z-[70] shadow-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div data-ronny-verksted-bredde className={VERKSTED_INNHOLD}>
            <div
              className={
                utvidet ? 'relative bg-transparent' : 'relative overflow-hidden rounded-t-[18px]'
              }
            >
              {utvidet ? null : (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <Grainient className="absolute inset-0 h-full w-full" />
                </div>
              )}
              <div
                className="relative w-full pt-1.5 pb-1.5"
                style={{ paddingLeft: KORN_RAMME + 8, paddingRight: KORN_RAMME + 8 }}
              >
                <div
                  data-ronny-prompt-kort
                  className={`${PHONE_KORT_FYLL} border-[#e0e0e0] bg-[#fff] px-2 py-1.5 text-[#1d1d1f]`}
                  style={{ borderRadius: RAMME_PX }}
                >
                  <PromptInput onSubmit={onPrompt} className="border-0 bg-transparent shadow-none">
                    <PromptInputBody data-ronny-prompt-linje className="min-w-0 flex-1">
                      <PromptInputTextarea
                        value={promptTekst}
                        onChange={(e) => setPromptTekst(e.target.value)}
                        placeholder="Spør Ronny …"
                        disabled={opptatt}
                        className="bg-transparent text-[16px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/45 md:text-label"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputSubmit status={submitStatus} />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
