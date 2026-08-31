'use client';

import { useChat } from '@ai-sdk/react';
import {
  AiDisclosure,
  BLOUB_HVILE,
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
  useBloubIdleLiv,
  useBloubPapir,
  X,
} from '@endwise/ui';
import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { DefaultChatTransport } from 'ai';
import { usePathname, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { sidekontekst } from './sidekontekst';

const FAB = 44;
const HODE = 64;

/**
 * Sticky workshop-bloub. Kompakt FAB (~44px), nederst til høyre, inne i
 * safe-area. Klikk åpner chat med bloub på toppen. Én montasje i app-skallet.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const [apen, setApen] = useState(false);
  const [tekst, setTekst] = useState('');
  const [suksess, setSuksess] = useState(false);
  const papir = useBloubPapir();
  const side = useMemo(() => sidekontekst(pathname, search), [pathname, search]);

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
  const skriver = tekst.trim().length > 0 && !opptatt;

  useEffect(() => {
    const onSuksess = () => {
      setSuksess(true);
      window.setTimeout(() => setSuksess(false), 1800);
    };
    window.addEventListener('endwise:booking-lagret', onSuksess);
    return () => window.removeEventListener('endwise:booking-lagret', onSuksess);
  }, []);

  const tilstand: StateId = suksess ? 'burst' : error ? 'alert' : opptatt ? 'thinking' : 'idle';
  const idleLiv = useBloubIdleLiv(!opptatt && !skriver && !error && !suksess);
  const uttrykk: ExpressionId = skriver ? 'attentif' : idleLiv;

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

  if (pathname.startsWith('/oppstart')) return null;

  return (
    <div
      data-workshop-fab
      className="pointer-events-none fixed right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-col items-end gap-2 md:right-4 md:bottom-4"
    >
      {apen ? (
        <div
          className="pointer-events-auto flex w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(34rem,70vh)] flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-lg"
          role="dialog"
          aria-label="Verkstedsassistent"
        >
          <div className="flex items-center gap-3 border-border border-b px-3 py-2">
            <BloubBot
              size={HODE}
              shape="cercle"
              color="#111111"
              paper={papir}
              state={tilstand}
              expression={uttrykk === BLOUB_HVILE ? BLOUB_HVILE : uttrykk}
              follow
              still={false}
              playing={false}
            />
            <div className="min-w-0 flex-1">
              <p className="text-label text-fg">Verkstedsassistent</p>
              <p className="truncate text-[11px] text-fg-muted">{side.merkelapp}</p>
            </div>
            <button
              type="button"
              onClick={() => setApen(false)}
              aria-label="Lukk assistent"
              className="flex size-7 items-center justify-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
            <AiDisclosure />
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="min-h-[10rem] flex-1">
                <MessageScrollerViewport className="px-0">
                  <MessageScrollerContent>
                    <MessageScrollerItem>
                      <Message align="start">
                        <MessageContent>
                          <MessageHeader>Bloub</MessageHeader>
                          <MessageBubble>
                            Hei — jeg er her om du vil sette opp bookinger, forstå timeplanen eller
                            bare spørre. Du er på {side.merkelapp} nå.
                          </MessageBubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                    {messages.map((melding) => {
                      const tekst = melding.parts
                        .filter((del) => del.type === 'text')
                        .map((del) => del.text)
                        .join('');
                      return (
                        <MessageScrollerItem key={melding.id} messageId={melding.id} scrollAnchor>
                          <Message align={melding.role === 'user' ? 'end' : 'start'}>
                            <MessageContent>
                              <MessageHeader>
                                {melding.role === 'user' ? 'Du' : 'Bloub'}
                              </MessageHeader>
                              {tekst ? (
                                <MessageBubble egen={melding.role === 'user'}>
                                  {tekst}
                                </MessageBubble>
                              ) : null}
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      );
                    })}
                    {error ? (
                      <MessageScrollerItem>
                        <p className="rounded-control border border-destructive/40 px-3 py-2 text-body text-destructive">
                          Noe gikk galt. Prøv igjen.
                        </p>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>

            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <input
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                placeholder="Spør om bookinger, timeplan …"
                disabled={opptatt}
                data-workshop-input
                className="h-control min-w-0 flex-1 rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={opptatt || !tekst.trim()}
                className="inline-flex h-control shrink-0 items-center rounded-control bg-fg px-3 text-label text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {opptatt ? '…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        aria-expanded={apen}
        aria-label={apen ? 'Lukk verkstedsassistent' : 'Åpne verkstedsassistent'}
        data-workshop-sticky
        className="pointer-events-auto flex items-center justify-center rounded-full bg-bg shadow-md ring-1 ring-border transition hover:ring-border-strong focus-visible:outline-2 focus-visible:outline-ring"
        style={{ width: FAB, height: FAB }}
      >
        <BloubBot
          size={FAB}
          shape="cercle"
          color="#111111"
          paper={papir}
          state={tilstand}
          expression={uttrykk}
          follow={false}
          still={false}
          playing={false}
        />
      </button>
    </div>
  );
}
