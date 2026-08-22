import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { resetBookingChoice } from './booking-choice.ts';
import {
  type ChatReply,
  createWidgetClient,
  WIDGET_DISCLOSURE_TEXT,
  type WidgetService,
} from './client.ts';
import { WIDGET_FALLBACK as fb } from './widget-fallbacks.ts';

/**
 * F4-03 — Embeddbar kundewidget: art. 50-merking + AI-chat + booking-flyt.
 *
 * [ART50-UI] Opplysningen om at man snakker med en AI står ØVERST, FØR samtalen,
 * og kan ikke skrus av — det er lovtekst (AI Act art. 50), ikke pynt. Serveren
 * sender i tillegg opplysningen i hvert chat-svar (belte og bukseseler).
 */
export interface EndwiseWidgetProps {
  apiBase: string;
  publishableKey: string;
  locale?: 'no' | 'en';
}

const box: CSSProperties = {
  fontFamily: 'var(--ew-font-sans, system-ui, sans-serif)',
  background: `var(--ew-bg, ${fb.bg})`,
  color: `var(--ew-fg, ${fb.fg})`,
  border: `1px solid var(--ew-border, ${fb.border})`,
  borderRadius: 'var(--ew-radius-lg, 12px)',
  width: '100%',
  maxWidth: 420,
  overflow: 'hidden',
};
const accent = `var(--ew-accent, ${fb.accent})`;
const accentFg = `var(--ew-accent-fg, ${fb.accentFg})`;

export function EndwiseWidget({ apiBase, publishableKey, locale = 'no' }: EndwiseWidgetProps) {
  const clientRef = useRef(createWidgetClient({ apiBase, publishableKey }));
  const [tab, setTab] = useState<'chat' | 'booking'>('chat');
  const [messages, setMessages] = useState<{ from: 'you' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState<WidgetService[]>([]);

  // Hent tjenester (til booking-fanen) når widgeten åpnes.
  useEffect(() => {
    clientRef.current
      .listServices()
      .then((r) => setServices(r.services))
      .catch(() => {});
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { from: 'you', text }]);
    setBusy(true);
    try {
      const reply: ChatReply = await clientRef.current.chat(text, locale);
      setMessages((m) => [...m, { from: 'ai', text: reply.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'ai', text: 'Beklager, noe gikk galt. Prøv igjen om litt.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={box}>
      {/* [ART50-UI] Art. 50-opplysning — ØVERST, alltid, kan ikke fjernes. */}
      <div
        data-art50="disclosure"
        role="note"
        aria-live="polite"
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          fontSize: 12,
          lineHeight: 1.4,
          background: `var(--ew-surface, ${fb.surface})`,
          borderBottom: `1px solid var(--ew-border, ${fb.border})`,
          color: `var(--ew-fg-muted, ${fb.fgMuted})`,
        }}
      >
        <span aria-hidden="true">🤖</span>
        <span>{WIDGET_DISCLOSURE_TEXT[locale]}</span>
      </div>

      {/* Faner */}
      <div style={{ display: 'flex', borderBottom: `1px solid var(--ew-border, ${fb.border})` }}>
        {(['chat', 'booking'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent',
              color: tab === t ? `var(--ew-fg, ${fb.fg})` : `var(--ew-fg-muted, ${fb.fgMuted})`,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {t === 'chat'
              ? locale === 'no'
                ? 'Chat'
                : 'Chat'
              : locale === 'no'
                ? 'Book time'
                : 'Book'}
          </button>
        ))}
      </div>

      {tab === 'chat' ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 380 }}>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <p style={{ fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
                {locale === 'no'
                  ? 'Spør oss om verkstedtjenester, priser eller ledig tid.'
                  : 'Ask us about services, prices or availability.'}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat-logg
                key={i}
                style={{
                  alignSelf: m.from === 'you' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '8px 10px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: m.from === 'you' ? accent : `var(--ew-surface, ${fb.surface})`,
                  color: m.from === 'you' ? accentFg : `var(--ew-fg, ${fb.fg})`,
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              borderTop: `1px solid var(--ew-border, ${fb.border})`,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={locale === 'no' ? 'Skriv en melding…' : 'Type a message…'}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid var(--ew-border, ${fb.border})`,
                background: `var(--ew-bg, ${fb.bg})`,
                color: `var(--ew-fg, ${fb.fg})`,
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={busy}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: accent,
                color: accentFg,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: busy ? 0.5 : 1,
              }}
            >
              {locale === 'no' ? 'Send' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <BookingPanel client={clientRef.current} services={services} locale={locale} />
      )}
    </div>
  );
}

/** F4-03..08 — booking-flyt (skjelett): velg tjeneste → tid → bekreft. */
function BookingPanel({
  client,
  services,
  locale,
}: {
  client: ReturnType<typeof createWidgetClient>;
  services: WidgetService[];
  locale: 'no' | 'en';
}) {
  const [serviceVersionId, setServiceVersionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [chosen, setChosen] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSlots() {
    setError(null);
    setSlots([]);
    setChosen('');
    if (!serviceVersionId) return;
    try {
      const r = await client.availability(serviceVersionId, date);
      setSlots(r.slots);
    } catch {
      setError(locale === 'no' ? 'Kunne ikke hente ledige tider' : 'Could not load availability');
    }
  }

  async function book() {
    setError(null);
    try {
      const r = await client.createBooking({
        serviceVersionId,
        startsAt: chosen,
        customer: { name, phone },
      });
      setDone(r.bookingId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (done) {
    return (
      <div style={{ padding: 16, fontSize: 14 }}>
        ✅{' '}
        {locale === 'no'
          ? 'Forespørsel sendt! Vi bekrefter på SMS.'
          : 'Request sent! We confirm by SMS.'}
      </div>
    );
  }

  const label: CSSProperties = {
    fontSize: 12,
    color: `var(--ew-fg-muted, ${fb.fgMuted})`,
    marginBottom: 4,
  };
  const field: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid var(--ew-border, ${fb.border})`,
    background: `var(--ew-bg, ${fb.bg})`,
    color: `var(--ew-fg, ${fb.fg})`,
    fontSize: 13,
    marginBottom: 10,
  };

  return (
    <div style={{ padding: 16, maxHeight: 380, overflowY: 'auto' }}>
      <div style={label}>{locale === 'no' ? 'Tjeneste' : 'Service'}</div>
      <select
        value={serviceVersionId}
        onChange={(e) => {
          setServiceVersionId(e.target.value);
          const cleared = resetBookingChoice();
          setSlots(cleared.slots);
          setChosen(cleared.chosen);
        }}
        style={field}
      >
        <option value="">{locale === 'no' ? 'Velg…' : 'Choose…'}</option>
        {services.map((s) => (
          <option key={s.serviceVersionId} value={s.serviceVersionId}>
            {s.name} · {s.durationMinutes} min
          </option>
        ))}
      </select>

      <div style={label}>{locale === 'no' ? 'Dato' : 'Date'}</div>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          const cleared = resetBookingChoice();
          setSlots(cleared.slots);
          setChosen(cleared.chosen);
        }}
        style={field}
      />
      <button
        type="button"
        onClick={loadSlots}
        disabled={!serviceVersionId}
        style={{ ...field, cursor: 'pointer', background: `var(--ew-surface, ${fb.surface})` }}
      >
        {locale === 'no' ? 'Vis ledige tider' : 'Show times'}
      </button>

      {slots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {slots.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setChosen(s)}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: `1px solid ${chosen === s ? accent : `var(--ew-border, ${fb.border})`}`,
                background: chosen === s ? accent : 'transparent',
                color: chosen === s ? accentFg : `var(--ew-fg, ${fb.fg})`,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {new Date(s).toLocaleTimeString(locale === 'no' ? 'nb-NO' : 'en', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </button>
          ))}
        </div>
      )}

      {chosen && (
        <>
          <div style={label}>{locale === 'no' ? 'Navn' : 'Name'}</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={field} />
          <div style={label}>{locale === 'no' ? 'Telefon' : 'Phone'}</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={field} />
          <button
            type="button"
            onClick={book}
            disabled={!name || !phone}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: accent,
              color: accentFg,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: name && phone ? 1 : 0.5,
            }}
          >
            {locale === 'no' ? 'Send booking-forespørsel' : 'Send request'}
          </button>
        </>
      )}

      {error && (
        <p style={{ color: 'var(--ew-danger, #f87171)', fontSize: 12, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
