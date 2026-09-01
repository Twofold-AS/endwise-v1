'use client';

import { useChat } from '@ai-sdk/react';
import { Grainient, useBloubIdleLiv } from '@endwise/ui';
import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { DefaultChatTransport } from 'ai';
import { usePathname, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { sidekontekst } from './sidekontekst';

/** Får plass i desktop 32px og telefon ~44px uten sirkel-chip. */
const STRIP_BOT = 28;
const SPIN_MS = 700;

/**
 * Grainient-stripe: telefon ~44px, desktop 32px.
 * Hvit «La KI-Ronny ta styringen» (blink 10s) + hvit Ronny ytterst til venstre,
 * uten sirkel. Klikk: surpris-øyne + kort spinn, deretter bunndock med kun input.
 * Samme komponent på telefon (under toppbaren) og desktop.
 * Ingen Quick-skriving. Ingen bunn-FAB. Ingen tall workshop-panel.
 */
export function WorkshopBloub() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const [apen, setApen] = useState(false);
  const [klikk, setKlikk] = useState(false);
  const [tekst, setTekst] = useState('');
  const [suksess, setSuksess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const spinTimer = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!apen) return;
    inputRef.current?.focus();
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApen(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [apen]);

  const tilstand: StateId = suksess ? 'burst' : error ? 'alert' : opptatt ? 'thinking' : 'idle';
  const idleLiv = useBloubIdleLiv(!klikk && !opptatt && !skriver && !error && !suksess);
  const uttrykk: ExpressionId = klikk ? 'surpris' : skriver ? 'attentif' : idleLiv;

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

  function onRonny() {
    if (apen) {
      setApen(false);
      setKlikk(false);
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
      return;
    }
    setKlikk(true);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
    spinTimer.current = window.setTimeout(() => {
      setKlikk(false);
      setApen(true);
    }, SPIN_MS);
  }

  if (pathname.startsWith('/oppstart')) return null;

  return (
    <div
      data-workshop-strip
      className="relative h-11 max-h-[44px] w-full shrink-0 overflow-hidden md:h-control md:max-h-[32px]"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Grainient className="absolute inset-0 h-full w-full" />
      </div>

      {apen ? (
        <div
          data-workshop-dock
          className="fixed inset-x-0 bottom-0 z-40 bg-bg pb-[env(safe-area-inset-bottom)]"
          role="dialog"
          aria-label="KI-Ronny"
        >
          {messages.length > 0 || error ? (
            <div className="max-h-[40vh] overflow-y-auto px-3 py-2">
              {messages.map((melding) => {
                const tekstDel = melding.parts
                  .filter((del) => del.type === 'text')
                  .map((del) => del.text)
                  .join('');
                if (!tekstDel) return null;
                return (
                  <p
                    key={melding.id}
                    className={`py-1 text-body ${
                      melding.role === 'user' ? 'text-right text-fg' : 'text-fg-muted'
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
          <form onSubmit={onSubmit} className="px-3 py-2">
            <input
              ref={inputRef}
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              placeholder="Spør Ronny …"
              disabled={opptatt}
              data-workshop-input
              className="h-control w-full rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </form>
        </div>
      ) : null}

      <div className="relative z-10 flex h-full items-center gap-2 px-3">
        <button
          type="button"
          onClick={onRonny}
          aria-expanded={apen}
          aria-label={apen ? 'Lukk KI-Ronny' : 'Åpne KI-Ronny'}
          data-workshop-sticky
          className="flex shrink-0 items-center justify-center bg-transparent focus-visible:outline-2 focus-visible:outline-white"
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
        <p data-ronny-blink className="min-w-0 flex-1 truncate text-label text-white">
          La KI-Ronny ta styringen
        </p>
      </div>
    </div>
  );
}
