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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PHONE_KORT_FYLL } from '../_shell/phone-home';
import { erTillattGaaTil } from './gaa-til';
import { norskChatFeil } from './norsk-chat-feil';
import { RonnyPil } from './ronny-ikoner';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;
const IDLE_MS = 5000;
const KORN_RAMME = 3;
const RAMME_PX = 18;
/** Kompakt dock: stripe + hero-kort + «se hele» på grainient. Første send → samtalehøyde. */
const DOCK_KOMPAKT = 'auto';
const DOCK_SAMTALE = 'min(48dvh, 28rem)';
/** Samme familie som telefon-hero (forhandlernavn + I dag / Pågår / Fullført). */
const PROMPT_KORT_MIN = '8.75rem';

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

function gaaTilHref(del: { type: string; state?: string; output?: unknown }): string | null {
  // Alias: Mistral får `gaaTil`; eldre/UI-matcher kan fortsatt se `gåTil`.
  if (!del.type.includes('gåTil') && !del.type.includes('gaaTil')) return null;
  if (del.state !== 'output-available') return null;
  const out = del.output as { ok?: boolean; href?: string } | undefined;
  if (!out?.ok || !out.href) return null;
  return out.href;
}

function skallHoyde(visning: RonnyVisning, harSamtale: boolean, foldet: boolean): string {
  if (visning === 'stripe') return '100%';
  if (visning === 'utvidet') return '100%';
  if (harSamtale || foldet) return DOCK_SAMTALE;
  return DOCK_KOMPAKT;
}

/**
 * Lukket = chrome-stripe (radius 0). Åpen dock: Grainient-ramme med
 * firkantet topp mot stripen (radius 0 oppe), ev. rund kun nederst.
 * Prompt-kortet møter stripen firkantet. «Se hele» = overlay under stripen.
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
  const spinTimer = useRef<number | null>(null);
  const ankerRef = useRef<HTMLDivElement>(null);
  const sisteGaaTil = useRef<string>('');
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);
  const apen = visning !== 'stripe';
  const lukket = visning === 'stripe';
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
  const harSamtale = messages.length > 0 || Boolean(error);
  const fastHoyde = visning === 'utvidet' || (visning === 'dock' && (harSamtale || foldet));
  const visHandtak = visning === 'dock';
  const opptatt = status === 'submitted' || status === 'streaming';
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

  useLayoutEffect(() => {
    function maal() {
      const el = ankerRef.current;
      if (!el) return;
      setAnkerTop(el.getBoundingClientRect().top);
    }
    maal();
    window.addEventListener('resize', maal);
    return () => window.removeEventListener('resize', maal);
  }, []);

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
    setVisning('utvidet');
  }

  if (pathname.startsWith('/oppstart')) return null;

  const visTraad = harSamtale || visning === 'utvidet' || foldet;
  const submitStatus = opptatt ? status : 'ready';

  return (
    <div
      ref={ankerRef}
      className="relative z-40 h-11 max-h-[44px] shrink-0 md:h-control md:max-h-[32px]"
    >
      <div
        data-workshop-shell
        data-ronny-overlay={utvidet ? '' : undefined}
        className={
          utvidet
            ? 'fixed right-0 bottom-0 left-0 z-[60] overflow-hidden rounded-none shadow-none'
            : `absolute inset-x-0 top-0 z-40 overflow-hidden shadow-none transition-[height,border-radius] duration-300 ease-out ${
                lukket ? 'rounded-none' : 'rounded-t-none rounded-b-[18px]'
              }`
        }
        style={
          utvidet
            ? { top: ankerTop, borderRadius: 0 }
            : {
                height: skallHoyde(visning, harSamtale, foldet),
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: lukket ? 0 : RAMME_PX,
                borderBottomRightRadius: lukket ? 0 : RAMME_PX,
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
            className="grid min-h-0 flex-1 transition-[grid-template-rows] duration-300 ease-out"
            style={{
              gridTemplateRows:
                visning === 'stripe' ? '0fr' : fastHoyde || utvidet ? '1fr' : 'auto',
            }}
            role="dialog"
            aria-label="KI-Ronny"
            aria-hidden={!apen}
          >
            <div
              data-ronny-ramme
              className={`flex min-h-0 flex-col overflow-hidden ${fastHoyde || utvidet ? 'h-full' : ''}`}
              style={
                lukket
                  ? undefined
                  : {
                      paddingLeft: KORN_RAMME,
                      paddingRight: KORN_RAMME,
                      paddingBottom: KORN_RAMME,
                    }
              }
            >
              <div
                data-ronny-kort-padding
                className={`mx-auto w-full max-w-[520px] px-3 md:max-w-[1120px] md:px-8 ${
                  fastHoyde || utvidet ? 'flex min-h-0 flex-1 flex-col' : ''
                } ${apen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} pt-3 transition-all duration-300 ease-out`}
              >
                <div
                  data-ronny-prompt-kort
                  className={`${PHONE_KORT_FYLL} flex flex-col overflow-hidden border-[#e0e0e0] bg-[#fff] p-3 text-[#1d1d1f] ${
                    visTraad ? 'justify-between' : 'justify-end'
                  } ${fastHoyde || utvidet ? 'h-full min-h-0 flex-1' : ''}`}
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: RAMME_PX,
                    borderBottomRightRadius: RAMME_PX,
                    minHeight: fastHoyde || utvidet ? undefined : PROMPT_KORT_MIN,
                  }}
                >
                  {visTraad ? (
                    <div
                      data-ronny-traad
                      className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-1"
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
                              <MessageBubble egen={melding.role === 'user'}>
                                {tekstDel}
                              </MessageBubble>
                            </MessageContent>
                          </Message>
                        );
                      })}
                      {error ? (
                        <Message align="start">
                          <MessageContent>
                            <MessageBubble>{norskChatFeil(error)}</MessageBubble>
                          </MessageContent>
                        </Message>
                      ) : null}
                    </div>
                  ) : null}
                  <PromptInput onSubmit={onPrompt} className="border-0 bg-transparent shadow-none">
                    <PromptInputBody
                      data-ronny-prompt-linje
                      className="min-w-0 flex-1 border-b border-[#e0e0e0]"
                    >
                      <PromptInputTextarea
                        value={promptTekst}
                        onChange={(e) => setPromptTekst(e.target.value)}
                        placeholder="Spør Ronny …"
                        disabled={opptatt}
                        className="bg-transparent text-label text-[#1d1d1f] placeholder:text-[#1d1d1f]/45"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputSubmit status={submitStatus} />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </div>
              {visHandtak ? (
                <div data-ronny-handtak-rad className="flex justify-center pt-3 pb-4">
                  <button
                    type="button"
                    data-ronny-utvid
                    data-ronny-handtak
                    aria-label="Se hele"
                    title="Se hele"
                    onClick={onUtvid}
                    className="p-0.5 text-white"
                  >
                    <RonnyPil size={12} />
                  </button>
                </div>
              ) : (
                <div className="pb-4" aria-hidden />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
