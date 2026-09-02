'use client';

import { useChat } from '@ai-sdk/react';
import {
  Grainient,
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
import { erTillattGaaTil } from './gaa-til';
import { RonnyPil } from './ronny-ikoner';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;
const IDLE_MS = 2500;
const KORN_RAMME = 3;
const RAMME_PX = 18;
/** Kompakt dock: stripe + composer + liten pil. Første send/fold → samtalehøyde. */
const DOCK_KOMPAKT = '10.5rem';
const DOCK_SAMTALE = 'min(48dvh, 28rem)';

type RonnyVisning = 'stripe' | 'dock' | 'utvidet';

/**
 * Idle-syklus ~2.5s — også når panelet er åpent.
 * colere flere ganger. wink/burst/thinking så ansiktet beveger seg.
 * Ikke triste / peureux / fatigue (triste, somnolent, blase, sleep).
 */
const RONNY_IDLE: readonly { expression: ExpressionId; state: StateId }[] = [
  { expression: 'colere', state: 'wink' },
  { expression: 'colere', state: 'burst' },
  { expression: 'surpris', state: 'wink' },
  { expression: 'colere', state: 'thinking' },
  { expression: 'heureux', state: 'burst' },
  { expression: 'curieux', state: 'wink' },
  { expression: 'colere', state: 'wink' },
  { expression: 'attentif', state: 'thinking' },
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
  if (!del.type.includes('gåTil') && !del.type.includes('gaaTil')) return null;
  if (del.state !== 'output-available') return null;
  const out = del.output as { ok?: boolean; href?: string } | undefined;
  if (!out?.ok || !out.href) return null;
  return out.href;
}

function skallHoyde(
  visning: RonnyVisning,
  ankerTop: number,
  harSamtale: boolean,
  foldet: boolean,
): string {
  if (visning === 'stripe') return '100%';
  if (visning === 'utvidet') return `calc(100dvh - ${ankerTop}px - 8px)`;
  if (harSamtale || foldet) return DOCK_SAMTALE;
  return DOCK_KOMPAKT;
}

/**
 * Lukket = vanlig chrome-stripe (radius 0). Åpen = Grainient-kort 18px,
 * samme px som dashboard-kort. Første send/fold → fast samtalehøyde.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const [visning, setVisning] = useState<RonnyVisning>('stripe');
  const [klikk, setKlikk] = useState(false);
  const [suksess, setSuksess] = useState(false);
  const [foldet, setFoldet] = useState(false);
  const [ankerTop, setAnkerTop] = useState(0);
  const spinTimer = useRef<number | null>(null);
  const ankerRef = useRef<HTMLDivElement>(null);
  const sisteGaaTil = useRef<string>('');
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);
  const apen = visning !== 'stripe';
  const lukket = visning === 'stripe';

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
  const visHandtak = visning === 'dock' && !harSamtale && !foldet;
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
  }, [visning]);

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

  function onForsteFold() {
    setFoldet(true);
  }

  if (pathname.startsWith('/oppstart')) return null;

  const visTraad = harSamtale || visning === 'utvidet' || foldet;

  return (
    <div
      ref={ankerRef}
      className="relative z-40 h-11 max-h-[44px] shrink-0 md:h-control md:max-h-[32px]"
    >
      <div
        data-workshop-shell
        className={`absolute inset-x-0 top-0 z-40 overflow-hidden shadow-none transition-[height,border-radius] duration-300 ease-out ${
          lukket ? 'rounded-none' : 'rounded-[18px]'
        }`}
        style={{
          height: skallHoyde(visning, ankerTop, harSamtale, foldet),
          borderRadius: lukket ? 0 : RAMME_PX,
        }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Grainient className="absolute inset-0 h-full w-full" />
        </div>

        <div className={`relative flex flex-col ${fastHoyde ? 'h-full' : ''}`}>
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
            style={{ gridTemplateRows: visning === 'stripe' ? '0fr' : fastHoyde ? '1fr' : 'auto' }}
            role="dialog"
            aria-label="KI-Ronny"
            aria-hidden={!apen}
          >
            <div
              className={`min-h-0 overflow-hidden ${fastHoyde ? 'h-full' : ''}`}
              style={
                lukket
                  ? undefined
                  : { paddingLeft: KORN_RAMME, paddingRight: KORN_RAMME, paddingBottom: KORN_RAMME }
              }
            >
              <div
                className={`flex min-h-0 flex-col overflow-hidden ${fastHoyde ? 'h-full' : ''} ${
                  lukket ? '' : 'bg-[#fff]'
                }`}
                style={lukket ? undefined : { borderRadius: RAMME_PX }}
              >
                {visTraad ? (
                  <div
                    data-ronny-traad
                    className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 md:px-8"
                  >
                    {messages.map((melding) => {
                      const tekstDel = tekstFraMelding(melding);
                      if (!tekstDel) return null;
                      return (
                        <p
                          key={melding.id}
                          className={`py-1.5 text-label leading-relaxed ${
                            melding.role === 'user' ? 'text-right text-[#1d1d1f]' : 'text-[#1d1d1f]/70'
                          }`}
                        >
                          {tekstDel}
                        </p>
                      );
                    })}
                    {error ? (
                      <p className="py-1 text-label text-destructive">Noe gikk galt. Prøv igjen.</p>
                    ) : null}
                  </div>
                ) : null}
                <div
                  data-ronny-kort-padding
                  className={`mx-auto w-full max-w-[1120px] shrink-0 px-3 pt-3 pb-6 md:px-8 transition-all duration-300 ease-out ${
                    apen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
                >
                  <PromptInput
                    onSubmit={onPrompt}
                    className="border-0 bg-transparent shadow-none"
                  >
                    <PromptInputBody className="min-w-0 flex-1">
                      <PromptInputTextarea
                        placeholder="Spør Ronny …"
                        disabled={opptatt}
                        className="bg-transparent text-label text-[#1d1d1f] placeholder:text-[#1d1d1f]/45"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputSubmit status={status} />
                    </PromptInputFooter>
                  </PromptInput>
                  {visHandtak ? (
                    <div className="flex justify-center pt-3">
                      <button
                        type="button"
                        data-ronny-utvid
                        data-ronny-handtak
                        aria-label="Utvid samtalen"
                        title="Utvid"
                        onClick={onForsteFold}
                        className="flex size-6 items-center justify-center rounded-full text-[#1d1d1f] ring-1 ring-[#e0e0e0]"
                      >
                        <RonnyPil size={12} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
