'use client';

import { Mail } from '@endwise/ui';
import { useState } from 'react';
import { BevelButton, CardShell, NewBadge } from '../../_shell/cards';

const SEGMENTS = ['Alle kunder', 'Aktive siste 90 dager', 'MC', 'Båt', 'ATV'] as const;

/**
 * Marked → Nyhetsbrev. Ramme for å skrive og sende nyhetsbrev til kundesegmenter
 * (utsending via Resend, F3-04). Backend for segment/utsending wires senere;
 * skjemaet + strukturen er på plass.
 */
export default function NyhetsbrevPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<string>(SEGMENTS[0]);

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-8 py-7">
      <div className="flex items-center gap-2">
        <Mail size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Nyhetsbrev</h1>
        <NewBadge />
      </div>

      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
          <label className="flex flex-col gap-1 text-fg-muted text-xs">
            Mottakersegment
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-fg outline-none"
            >
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-fg-muted text-xs">
            Emne
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Vårservice-kampanje …"
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
          <label className="flex flex-col gap-1 text-fg-muted text-xs">
            Innhold
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Skriv nyhetsbrevet …"
              className="min-h-40 resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
        </div>
        <div className="flex items-center justify-between px-1.5 pt-2 pb-1">
          <span className="text-fg-faint text-xs">
            Utsending via Resend (F3-04) — kobles senere.
          </span>
          <BevelButton>Send nyhetsbrev</BevelButton>
        </div>
      </CardShell>
    </div>
  );
}
