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
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { erTillattGaaTil } from './gaa-til';
import { RonnyPil } from './ronny-ikoner';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;
const IDLE_MS = 2500;
const KORN_RAMME = 3;
const RAMME_PX = 18;
const HANDTAK_DRA_DOCK = 40;
const HANDTAK_DRA_FULL = 110;

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

function skallHoyde(visning: RonnyVisning, ankerTop: number): string {
  if (visning === 'stripe') return '100%';
  if (visning === 'dock') return 'min(48dvh, 28rem)';
  return `calc(100dvh - ${ankerTop}px - 8px)`;
}

/**
 * Én Grainient-boks (18px ytre + 18px indre). Stripe + panel er samme skall:
 * lukket = strippehøyde, åpen = høyde folder seg ned som overlay over dest-bar
 * uten å skyve siden. Sirkel-håndtak nederst. Escape: utvidet → dock → stripe.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const [visning, setVisning] = useState<RonnyVisning>('stripe');
  const [klikk, setKlikk] = useState(false);
  const [suksess, setSuksess] = useState(false);
  const [ankerTop, setAnkerTop] = useState(0);
  const spinTimer = useRef<number | null>(null);
  const ankerRef = useRef<HTMLDivElement>(null);
  const draStart = useRef<number | null>(null);
  const harDratt = useRef(false);
  const sisteGaaTil = useRef<string>('');
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);
  const apen = visning !== 'stripe';

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

  function onHandtakNed(e: PointerEvent<HTMLButtonElement>) {
    draStart.current = e.clientY;
    harDratt.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandtakFlytt(e: PointerEvent<HTMLButtonElement>) {
    if (draStart.current == null) return;
    const dy = e.clientY - draStart.current;
    if (dy > 16) harDratt.current = true;
    if (dy > HANDTAK_DRA_FULL) setVisning('utvidet');
    else if (dy > HANDTAK_DRA_DOCK) setVisning((v) => (v === 'stripe' ? 'dock' : v));
  }

  function onHandtakOpp() {
    if (!harDratt.current) {
      setVisning((v) => (v === 'stripe' ? 'dock' : v === 'dock' ? 'utvidet' : 'stripe'));
    }
    draStart.current = null;
  }

  if (pathname.startsWith('/oppstart')) return null;

  const visTraad = visning === 'utvidet' || messages.length > 0 || error;

  return (
    <div
      ref={ankerRef}
      className="relative z-40 h-11 max-h-[44px] shrink-0 md:h-control md:max-h-[32px]"
    >
      <div
        data-workshop-shell
        className="absolute inset-x-0 top-0 z-40 overflow-hidden rounded-[18px] shadow-none transition-[height] duration-300 ease-out"
        style={{ height: skallHoyde(visning, ankerTop), borderRadius: RAMME_PX }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Grainient className="absolute inset-0 h-full w-full" />
        </div>

        <div className="relative flex h-full flex-col">
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
            style={{ gridTemplateRows: visning === 'stripe' ? '0fr' : '1fr' }}
            role="dialog"
            aria-label="KI-Ronny"
            aria-hidden={!apen}
          >
            <div
              className="min-h-0 overflow-hidden"
              style={{ paddingLeft: KORN_RAMME, paddingRight: KORN_RAMME, paddingBottom: KORN_RAMME }}
            >
              <div
                className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fff]"
                style={{ borderRadius: RAMME_PX }}
              >
                {visTraad ? (
                  <div
                    className={`overflow-y-auto px-5 ${
                      visning === 'utvidet' ? 'min-h-0 flex-1 py-4' : 'max-h-[28vh] py-3'
                    }`}
                  >
                    {messages.map((melding) => {
                      const tekstDel = tekstFraMelding(melding);
                      if (!tekstDel) return null;
                      return (
                        <p
                          key={melding.id}
                          className={`py-2 text-body leading-relaxed ${
                            melding.role === 'user' ? 'text-right text-[#1d1d1f]' : 'text-[#1d1d1f]/70'
                          }`}
                        >
                          {tekstDel}
                        </p>
                      );
                    })}
                    {error ? (
                      <p className="py-1 text-body text-destructive">Noe gikk galt. Prøv igjen.</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="px-5 pt-2 pb-12">
                  <PromptInput
                    onSubmit={onPrompt}
                    className="border border-[#e0e0e0] bg-[#f5f5f7] shadow-none"
                    style={{ borderRadius: RAMME_PX }}
                  >
                    <PromptInputBody>
                      <PromptInputTextarea
                        placeholder="Spør Ronny …"
                        disabled={opptatt}
                        className="text-label text-[#1d1d1f] placeholder:text-[#1d1d1f]/45"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputSubmit status={status} />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-ronny-utvid
          data-ronny-handtak
          aria-label={visning === 'utvidet' ? 'Minimer samtalen' : 'Utvid samtalen'}
          title={visning === 'utvidet' ? 'Minimer' : 'Utvid'}
          onPointerDown={onHandtakNed}
          onPointerMove={onHandtakFlytt}
          onPointerUp={onHandtakOpp}
          onPointerCancel={onHandtakOpp}
          className="absolute bottom-1 left-1/2 z-20 flex size-10 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full bg-[#fafafc] text-[#1d1d1f] ring-1 ring-[#e0e0e0] active:cursor-grabbing"
        >
          <RonnyPil size={16} opp={visning === 'utvidet'} />
        </button>
      </div>
    </div>
  );
}
