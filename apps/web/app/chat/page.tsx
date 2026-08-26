'use client';

import { AiDisclosure, Card, HumanHandoverNotice, Input, StatefulButton } from '@endwise/ui';
import { useState } from 'react';

/**
 * [ART50-UI] Minimal AI-chat-flate — bygget for å oppfylle AI Act art. 50 i tide.
 * stygg med vilje. Fristen er 2. august 2026, og den juridiske gyldigheten
 * avhenger ikke av design. Denne skjermen finnes for at merkingen skal være på
 * plass og testbar før fristen — ikke for å være pen.
 * Design-pass når tokens er inne: roadmap F4-15. Søk `[ART50-UI]`.
 * Det som ikke kan endres i design-passet:
 * at `<AiDisclosure>` står Øverst, før første melding
 * at `<HumanHandoverNotice>` vises når agenten eskalerer (F6-05)
 * Alt annet er fritt vilt.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'human' | 'user'; text: string }>>(
    [],
  );
  const [input, setInput] = useState('');
  const [escalated, setEscalated] = useState(false);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Kundechat</h1>

      {/*
       * [ART50-UI] Art. 50(1): informasjonen skal gis senest ved første
       * interaksjon. Derfor står den her — over meldingene, ikke under.
       */}
      <AiDisclosure className="mb-4" />

      <Card className="min-h-40 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-fg-muted">Still et spørsmål om bookingen din.</p>
        )}
        {messages.map((message, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only meldingslogg, indeks er stabil
          <p key={`${message.from}-${i}`} className="text-sm">
            <strong>
              {message.from === 'user' ? 'Du' : message.from === 'ai' ? 'Assistent (AI)' : 'Ansatt'}
              :
            </strong>{' '}
            {message.text}
          </p>
        ))}

        {/* [ART50-UI] Brukeren skal vite når det skifter fra maskin til menneske. */}
        {escalated && <HumanHandoverNotice className="mt-2" />}
      </Card>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          setMessages((current) => [...current, { from: 'user', text: input }]);
          setInput('');
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Skriv en melding…"
          aria-label="Melding til assistenten"
        />
        <StatefulButton type="submit" state="idle">
          Send
        </StatefulButton>
      </form>

      <button
        type="button"
        className="mt-3 text-xs underline text-fg-muted"
        onClick={() => setEscalated(true)}
      >
        Jeg vil snakke med et menneske
      </button>
    </main>
  );
}
