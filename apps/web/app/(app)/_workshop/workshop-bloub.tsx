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
import { PilNed, PilOpp } from './ronny-ikoner';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;
const IDLE_MS = 5000;
const KORN_RAMME = 3;

type RonnyVisning = 'stripe' | 'dock' | 'utvidet';

/**
 * Seks ekte bloub-uttrykk/tilstander, syklet hvert 5. sekund.
 * colere, surpris, wink (blunk), curieux, attentif, heureux — fra vendor, ikke Morph.
 */
const RONNY_IDLE: readonly { expression: ExpressionId; state: StateId }[] = [
  { expression: 'colere', state: 'idle' },
  { expression: 'surpris', state: 'idle' },
  { expression: 'neutre', state: 'wink' },
  { expression: 'curieux', state: 'idle' },
  { expression: 'attentif', state: 'idle' },
  { expression: 'heureux', state: 'idle' },
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
 * Grainient-stripe: telefon ~44px, desktop 32px.
 * Hele klusteret (Ronny + tekst + pil) åpner panelet under stripen.
 * Grainient er ramme på boksen. Pil nederst = fullskjerm. Escape: utvidet → dock → stripe.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const [visning, setVisning] = useState<RonnyVisning>('stripe');
  const [klikk, setKlikk] = useState(false);
  const [suksess, setSuksess] = useState(false);
  const [stripBunn, setStripBunn] = useState(0);
  const spinTimer = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
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
  const idle = useRonnyIdle(!klikk && !opptatt && !error && !suksess && visning === 'stripe');

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
      const el = stripRef.current;
      if (!el) return;
      setStripBunn(el.getBoundingClientRect().bottom);
    }
    maal();
    window.addEventListener('resize', maal);
    return () => window.removeEventListener('resize', maal);
  }, [apen, visning]);

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

  if (pathname.startsWith('/oppstart')) return null;

  const visTraad = visning === 'utvidet' || messages.length > 0 || error;

  return (
    <div className="relative shrink-0">
      <div
        ref={stripRef}
        data-workshop-strip
        className="relative h-11 max-h-[44px] w-full overflow-hidden md:h-control md:max-h-[32px]"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Grainient className="absolute inset-0 h-full w-full" />
        </div>

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
            <PilNed size={14} />
          </button>
        </div>
      </div>

      {apen ? (
        <div
          data-workshop-dock
          data-ronny-visning={visning}
          className={
            visning === 'utvidet'
              ? 'fixed inset-x-0 z-40 shadow-none'
              : 'relative z-30 w-full pb-4 shadow-none'
          }
          style={visning === 'utvidet' ? { top: stripBunn, bottom: 0 } : undefined}
          role="dialog"
          aria-label="KI-Ronny"
        >
          <div className="relative h-full min-h-0 overflow-visible">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Grainient className="absolute inset-0 h-full w-full" />
            </div>
            <div
              className={`relative flex min-h-0 flex-col bg-[#fff] ${
                visning === 'utvidet' ? 'h-full' : ''
              }`}
              style={{ margin: KORN_RAMME }}
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
              <div className="px-5 pt-2 pb-6">
                <PromptInput
                  onSubmit={onPrompt}
                  className="border border-[#e0e0e0] bg-[#f5f5f7] shadow-none"
                  style={{ borderRadius: 18 }}
                >
                  <PromptInputBody>
                    <PromptInputTextarea
                      placeholder="Spør Ronny …"
                      disabled={opptatt}
                      className="text-[#1d1d1f] placeholder:text-[#1d1d1f]/45"
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputSubmit status={status} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
            <button
              type="button"
              data-ronny-utvid
              aria-label={visning === 'utvidet' ? 'Minimer samtalen' : 'Utvid samtalen'}
              title={visning === 'utvidet' ? 'Minimer' : 'Utvid'}
              onClick={() => setVisning(visning === 'utvidet' ? 'dock' : 'utvidet')}
              className="absolute bottom-0 left-1/2 z-10 flex size-8 -translate-x-1/2 translate-y-1/2 items-center justify-center text-white"
            >
              {visning === 'utvidet' ? <PilOpp size={16} /> : <PilNed size={16} />}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
