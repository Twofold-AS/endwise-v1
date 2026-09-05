'use client';

import { useChat } from '@ai-sdk/react';
import {
  Message,
  MessageBubble,
  MessageContent,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  X,
} from '@endwise/ui';
import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { DefaultChatTransport } from 'ai';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PHONE_KORT_FYLL } from '../_shell/phone-home';
import { useSidebarState } from '../_shell/sidebar-state';
import { erTillattGaaTil } from './gaa-til';
import { GradualBlur } from './gradual-blur';
import { norskChatFeil } from './norsk-chat-feil';
import { RonnyForstorIkon, RonnyHandtak } from './ronny-ikoner';
import {
  RONNY_SHEET_RADIUS_PX,
  ronnySheetEtterDra,
  ronnySheetHoydePx,
  synligViewportHoyde,
} from './ronny-sheet';
import { useRonnySheet } from './ronny-sheet-state';
import { sidekontekst } from './sidekontekst';

const IDLE_MS = 5000;
const RAMME_PX = 18;
const APPLE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const HIT = 'inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg';
/** Safe-area er padding inne i composer, ikke et løft fra bunnkanten. */
const COMPOSER_SAFE = 'max(6px, env(safe-area-inset-bottom))';
const TENKER_TEKST = 'Ronny tenker…';
const BOBLE_TEKST = 'text-[14px] leading-snug md:text-body md:leading-relaxed';

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
  if (!del.type.includes('gåTil') && !del.type.includes('gaaTil')) return null;
  if (del.state !== 'output-available') return null;
  const out = del.output as { ok?: boolean; href?: string } | undefined;
  if (!out?.ok || !out.href) return null;
  return out.href;
}

/**
 * KI-Ronny: bunn-sheet på telefon (80/100), høyre overlay på desktop (max 400px).
 * Ingen stripe, ingen peek. Telefon: forstørr / tydelig swipe opp. Desktop: X / Escape.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const { phoneOpen } = useSidebarState();
  const { apen, hoyde, lukk, forstor } = useRonnySheet();
  const [suksess, setSuksess] = useState(false);
  const [promptTekst, setPromptTekst] = useState('');
  const [synlig, setSynlig] = useState(0);
  const [loggOverflow, setLoggOverflow] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const phoneLoggRef = useRef<HTMLDivElement>(null);
  const desktopLoggRef = useRef<HTMLDivElement>(null);
  const draStartY = useRef<number | null>(null);
  const sisteGaaTil = useRef<string>('');
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);
  const utvidet = hoyde === 100;

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
  const idle = useRonnyIdle(true);

  useEffect(() => {
    const onSuksess = () => {
      setSuksess(true);
      window.setTimeout(() => setSuksess(false), 1800);
    };
    window.addEventListener('endwise:booking-lagret', onSuksess);
    return () => window.removeEventListener('endwise:booking-lagret', onSuksess);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: lukk helt ved sidebar-navigasjon
  useEffect(() => {
    lukk();
  }, [pathname]);

  useEffect(() => {
    if (!phoneOpen) return;
    lukk();
  }, [phoneOpen, lukk]);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('[data-ronny-side-scroll]');
    if (!scroller) return;
    if (apen) {
      scroller.setAttribute('data-ronny-laast', '');
      scroller.style.overflow = 'hidden';
    } else {
      scroller.removeAttribute('data-ronny-laast');
      scroller.style.overflow = '';
    }
    return () => {
      scroller.removeAttribute('data-ronny-laast');
      scroller.style.overflow = '';
    };
  }, [apen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mål på nytt når sheet/logg endres
  useLayoutEffect(() => {
    function maal() {
      setSynlig(synligViewportHoyde(window.visualViewport, window.innerHeight));
      const logg = window.matchMedia('(min-width: 768px)').matches
        ? desktopLoggRef.current
        : phoneLoggRef.current;
      if (logg) setLoggOverflow(logg.scrollHeight > logg.clientHeight + 1);
      else setLoggOverflow(false);
    }
    maal();
    window.visualViewport?.addEventListener('resize', maal);
    window.addEventListener('resize', maal);
    return () => {
      window.visualViewport?.removeEventListener('resize', maal);
      window.removeEventListener('resize', maal);
    };
  }, [apen, promptTekst, hoyde, messages]);

  useEffect(() => {
    if (!apen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      lukk();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [apen, lukk]);

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

  const tilstand: StateId = suksess ? 'burst' : error ? 'alert' : opptatt ? 'thinking' : idle.state;
  const uttrykk: ExpressionId = idle.expression;

  function send(innhold: string) {
    const rensket = innhold.trim();
    if (!rensket || opptatt) return;
    setPromptTekst('');
    void sendMessage({ text: rensket });
  }

  function onPrompt(melding: PromptInputMessage) {
    send(melding.text);
  }

  function onHandtakNed(e: ReactPointerEvent<HTMLButtonElement>) {
    draStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandtakOpp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (draStartY.current == null) return;
    const dy = e.clientY - draStartY.current;
    draStartY.current = null;
    const gest = ronnySheetEtterDra(dy);
    if (gest === 'lukk') lukk();
    else if (gest === 'forstor') forstor();
  }

  if (pathname.startsWith('/oppstart')) return null;

  const submitStatus = opptatt ? status : 'ready';
  const sheetHoyde = synlig > 0 ? ronnySheetHoydePx(hoyde, synlig) : undefined;

  const loggUtsnitt = (loggRef: RefObject<HTMLDivElement | null>) => (
    <div data-ronny-logg-ramme className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={loggRef}
        data-ronny-traad
        className="no-scrollbar flex h-full min-h-0 flex-col gap-6 overflow-y-auto px-3 pt-1 pb-1 md:gap-5"
      >
        {messages.map((melding) => {
          const tekstDel = tekstFraMelding(melding);
          if (!tekstDel) return null;
          return (
            <Message key={melding.id} align={melding.role === 'user' ? 'end' : 'start'}>
              <MessageContent>
                <MessageBubble egen={melding.role === 'user'} className={BOBLE_TEKST}>
                  {tekstDel}
                </MessageBubble>
              </MessageContent>
            </Message>
          );
        })}
        {error ? (
          <Message align="start">
            <MessageContent>
              <MessageBubble className={BOBLE_TEKST}>{norskChatFeil(error)}</MessageBubble>
            </MessageContent>
          </Message>
        ) : null}
      </div>
      {loggOverflow ? (
        <>
          <GradualBlur
            target="parent"
            position="top"
            height="6rem"
            strength={2}
            divCount={5}
            curve="bezier"
            exponential
          />
          <GradualBlur
            target="parent"
            position="bottom"
            height="6rem"
            strength={2}
            divCount={5}
            curve="bezier"
            exponential
          />
        </>
      ) : null}
    </div>
  );

  const promptKort = () => (
    <div
      data-ronny-prompt-kort
      className={`${PHONE_KORT_FYLL} rounded-[18px] border-[#e0e0e0] bg-[#fff] px-2 py-1.5 text-[#1d1d1f]`}
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
  );

  if (!apen) return null;

  return (
    <>
    <div className="md:hidden">
      <button
        type="button"
        data-ronny-scrim
        aria-label="Lukk Ronny"
        className="fixed inset-0 z-[60] bg-fg/25"
        onClick={lukk}
      />
      <div
        data-ronny-sheet
        data-ronny-flate
        data-ronny-hoyde={hoyde}
        data-workshop-shell
        className={`fixed inset-x-0 bottom-0 z-[70] flex flex-col overflow-hidden bg-[#fff] shadow-none ${
          hoyde === 100 ? 'h-[100dvh]' : 'h-[80dvh]'
        }`}
        style={{
          height: sheetHoyde,
          borderTopLeftRadius: RONNY_SHEET_RADIUS_PX,
          borderTopRightRadius: RONNY_SHEET_RADIUS_PX,
          transition: `height 200ms ${APPLE_EASE}`,
        }}
        role="dialog"
        aria-label="Ronny"
      >
        <div className="flex justify-center pt-2">
          <button
            type="button"
            data-ronny-handtak
            data-ronny-handtak-rad
            data-ronny-utvid
            aria-label="Dra for å lukke eller forstørre"
            onPointerDown={onHandtakNed}
            onPointerUp={onHandtakOpp}
            className="flex min-h-11 cursor-grab touch-none items-center justify-center px-6 py-1 active:cursor-grabbing"
          >
            <RonnyHandtak />
          </button>
        </div>
        <div
          data-ronny-sheet-header
          className="flex h-row shrink-0 items-center justify-between px-2"
        >
          <button
            type="button"
            data-ronny-forstor
            aria-label="Forstørr"
            aria-pressed={utvidet}
            className={HIT}
            onClick={forstor}
          >
            <RonnyForstorIkon />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span data-ronny-spin className="flex">
              <BloubBot
                size={28}
                shape="cercle"
                color="#1d1d1f"
                paper="#ffffff"
                state={tilstand}
                expression={uttrykk}
                follow={false}
                still={false}
                playing={false}
              />
            </span>
            <span
              data-ronny-tenker={opptatt ? '' : undefined}
              className={
                opptatt
                  ? 'ronny-tenker-tekst truncate text-title'
                  : 'truncate text-title text-[#1d1d1f]'
              }
            >
              Ronny
            </span>
            {opptatt ? <span className="sr-only">{TENKER_TEKST}</span> : null}
          </div>
          <button type="button" data-ronny-lukk aria-label="Lukk" className={HIT} onClick={lukk}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div
          data-workshop-dock
          data-ronny-visning={hoyde}
          className="flex min-h-0 flex-1 flex-col bg-[#fff] text-[#1d1d1f]"
        >
          <div
            data-ronny-svar-kort
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent pt-1 text-[#1d1d1f]"
          >
            {loggUtsnitt(phoneLoggRef)}
          </div>
          <div
            ref={composerRef}
            data-ronny-composer
            data-ronny-prompt-flate
            className="relative w-full shrink-0 overflow-hidden rounded-none bg-transparent"
          >
            <div className="relative px-3 pt-1.5" style={{ paddingBottom: COMPOSER_SAFE }}>
              {promptKort()}
            </div>
          </div>
        </div>
      </div>
    </div>
      <div className="absolute inset-0 z-[60] hidden md:block" data-ronny-desktop>
        <button
          type="button"
          data-ronny-desktop-scrim
          aria-label="Lukk Ronny"
          className="absolute inset-0 bg-fg/15"
          onClick={lukk}
        />
        <aside
          data-ronny-desktop-panel
          data-ronny-flate
          className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[400px] flex-col overflow-hidden bg-[#fff]"
          role="dialog"
          aria-label="Ronny"
        >
          <div
            data-ronny-desktop-header
            className="flex h-row shrink-0 items-center justify-between px-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span data-ronny-spin className="flex">
                <BloubBot
                  size={28}
                  shape="cercle"
                  color="#1d1d1f"
                  paper="#ffffff"
                  state={tilstand}
                  expression={uttrykk}
                  follow={false}
                  still={false}
                  playing={false}
                />
              </span>
              <span
                data-ronny-tenker={opptatt ? '' : undefined}
                className={
                  opptatt
                    ? 'ronny-tenker-tekst truncate text-title'
                    : 'truncate text-title text-[#1d1d1f]'
                }
              >
                Ronny
              </span>
              {opptatt ? <span className="sr-only">{TENKER_TEKST}</span> : null}
            </div>
            <button type="button" data-ronny-lukk aria-label="Lukk" className={HIT} onClick={lukk}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div
            data-workshop-dock
            className="flex min-h-0 flex-1 flex-col bg-[#fff] text-[#1d1d1f]"
          >
            <div
              data-ronny-svar-kort
              className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent pt-1 text-[#1d1d1f]"
            >
              {loggUtsnitt(desktopLoggRef)}
            </div>
            <div
              data-ronny-composer
              data-ronny-prompt-flate
              className="relative w-full shrink-0 overflow-hidden rounded-none bg-transparent"
            >
              <div className="relative px-3 pt-1.5 pb-3">{promptKort()}</div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
