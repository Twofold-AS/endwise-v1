'use client';

import { Sparkles } from '@endwise/ui';
import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { BevelButton, CardShell, NewBadge } from '../../_shell/cards';

type Msg = { from: 'user' | 'agent'; text: string };

/**
 * Marked → Framer-agent (chat). Rammen for markedsførings-agenten som bygger
 * Framer-forhandlersider. Agenten kjører som egen tjeneste (`@endwise/framer-agent`,
 * Hono på :3003). Denne flaten POSTer meldinger dit når klienten wires
 * (env `NEXT_PUBLIC_FRAMER_AGENT_URL`, default http://localhost:3003). Inntil da:
 * lokal ekko-placeholder så rammen er komplett.
 */
export default function FramerAgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { from: 'user', text },
      {
        from: 'agent',
        text: 'Framer-agenten er ikke koblet til ennå (kjører på :3003). Rammen er klar — svar kommer når klienten wires.',
      },
    ]);
    setInput('');
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[820px] flex-col gap-4 px-8 py-7">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Framer-agent</h1>
        <NewBadge />
        <span className="ml-auto text-fg-faint text-xs">@endwise/framer-agent · :3003</span>
      </div>

      <CardShell className="min-h-0 flex-1">
        <div className="flex min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto rounded-lg bg-[#0e0e0e] p-4">
          {messages.length === 0 ? (
            <p className="m-auto max-w-sm text-center text-fg-faint text-sm">
              Be agenten bygge eller endre en forhandlerside i Framer — f.eks. «lag en landingsside
              for MC-service i Bergen».
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat-logg
                key={i}
                className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] ${
                  m.from === 'user'
                    ? 'self-end bg-surface-2 text-fg'
                    : 'self-start bg-card text-fg-muted'
                }`}
              >
                {m.text}
              </div>
            ))
          )}
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 px-1.5 pt-2 pb-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Skriv til Framer-agenten…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-border bg-[#0e0e0e] px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-faint"
          />
          <BevelButton onClick={send}>Send</BevelButton>
        </form>
      </CardShell>
    </div>
  );
}
