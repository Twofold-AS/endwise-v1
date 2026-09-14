import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { resetBookingChoice } from './booking-choice.ts';
import {
  type ChatReply,
  createWidgetClient,
  WIDGET_DISCLOSURE_TEXT,
  type WidgetClient,
  type WidgetService,
  type WidgetShopItem,
} from './client.ts';
import type { WidgetMode } from './modes.ts';
import { WIDGET_FALLBACK as fb } from './widget-fallbacks.ts';

/**
 * Embeddbar kundewidget: art. 50-merking + AI-chat + booking-flyt.
 * [ART50-UI] Opplysningen om at man snakker med en AI står Øverst, før samtalen,
 * og kan ikke skrus av — det er lovtekst (AI Act art. 50), ikke pynt. Serveren
 * sender i tillegg opplysningen i hvert chat-svar (belte og bukseseler).
 */
export interface EndwiseWidgetProps {
  apiBase: string;
  publishableKey: string;
  locale?: 'no' | 'en';
  /**
   * Framer-modus (F4-09). Uten modus vises chat + booking som før (/butikk).
   * `webshop` feiler lukket uten shop-flagg. `tracking` skrur på funnel-hooks.
   */
  mode?: WidgetMode;
  /** F4-14. Av som default utenom tracking-modus, så /butikk ikke spammer stream. */
  trackEvents?: boolean;
  /**
   * Samme katalog som Tjenester (`services.list` / `service_versions`).
   * Brukes som start og som fallback når `/widget/services` ikke svarer.
   * Widgeten kaller aldri `forhandler.get`.
   */
  initialServices?: WidgetService[];
}

type ServicesState =
  | { status: 'loading' }
  | { status: 'ready'; services: WidgetService[] }
  | { status: 'empty' }
  | { status: 'error' };

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

export function EndwiseWidget({
  apiBase,
  publishableKey,
  locale = 'no',
  mode,
  trackEvents,
  initialServices,
}: EndwiseWidgetProps) {
  const clientRef = useRef(createWidgetClient({ apiBase, publishableKey }));
  const instrument = trackEvents === true || mode === 'tracking';
  const initialTab: 'chat' | 'booking' = mode === 'booking' ? 'booking' : 'chat';
  const [tab, setTab] = useState<'chat' | 'booking'>(initialTab);
  const [messages, setMessages] = useState<{ from: 'you' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [servicesState, setServicesState] = useState<ServicesState>(() =>
    initialServices && initialServices.length > 0
      ? { status: 'ready', services: initialServices }
      : { status: 'loading' },
  );

  const lastTjenester = useCallback(() => {
    setServicesState({ status: 'loading' });
    clientRef.current
      .listServices()
      .then((r) => {
        const list = r.services.length > 0 ? r.services : (initialServices ?? []);
        setServicesState(
          list.length > 0 ? { status: 'ready', services: list } : { status: 'empty' },
        );
      })
      .catch(() => {
        if (initialServices && initialServices.length > 0) {
          setServicesState({ status: 'ready', services: initialServices });
          return;
        }
        setServicesState({ status: 'error' });
      });
  }, [initialServices]);

  useEffect(() => {
    lastTjenester();
  }, [lastTjenester]);

  useEffect(() => {
    if (!instrument) return;
    void clientRef.current.track('widget.viewed', { mode: mode ?? 'full', locale });
  }, [instrument, locale, mode]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { from: 'you', text }]);
    setBusy(true);
    try {
      if (instrument) {
        void clientRef.current.track('widget.chat.sent', { mode: mode ?? 'ai', locale });
      }
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
      {/* [ART50-UI] Art. 50-opplysning — Øverst, alltid, kan ikke fjernes. */}
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

      {mode === 'tracking' && (
        <p
          style={{
            margin: 0,
            padding: '8px 12px',
            fontSize: 12,
            color: `var(--ew-fg-muted, ${fb.fgMuted})`,
            borderBottom: `1px solid var(--ew-border, ${fb.border})`,
          }}
        >
          {locale === 'no'
            ? 'Funnel-måling på (uten cookies). Steg sendes til /widget/events.'
            : 'Cookieless funnel is on. Steps go to /widget/events.'}
        </p>
      )}

      {mode === 'webshop' ? (
        <ShopPanel client={clientRef.current} locale={locale} instrument={instrument} />
      ) : (
        <>
          {/* Faner */}
          <div
            style={{ display: 'flex', borderBottom: `1px solid var(--ew-border, ${fb.border})` }}
          >
            {(mode === 'booking'
              ? (['booking'] as const)
              : mode === 'ai'
                ? (['chat'] as const)
                : (['chat', 'booking'] as const)
            ).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  setTab(t);
                  if (instrument) {
                    void clientRef.current.track('widget.tab', {
                      tab: t,
                      mode: mode ?? 'full',
                      locale,
                    });
                  }
                }}
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
                    fontSize: 16,
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
            <BookingPanel
              client={clientRef.current}
              state={servicesState}
              locale={locale}
              onRetry={lastTjenester}
              instrument={instrument}
            />
          )}
        </>
      )}
    </div>
  );
}

/** F4-03..08 — booking-flyt (skjelett): velg tjeneste → tid → bekreft. */
function BookingPanel({
  client,
  state,
  locale,
  onRetry,
  instrument,
}: {
  client: ReturnType<typeof createWidgetClient>;
  state: ServicesState;
  locale: 'no' | 'en';
  onRetry: () => void;
  instrument: boolean;
}) {
  const services = state.status === 'ready' ? state.services : [];
  const [serviceVersionId, setServiceVersionId] = useState('');
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(new Date()),
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [chosen, setChosen] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hentet, setHentet] = useState(false);

  async function loadSlots() {
    setError(null);
    setSlots([]);
    setChosen('');
    setHentet(false);
    if (!serviceVersionId) return;
    if (instrument) void client.track('widget.booking.step', { step: 'availability', locale });
    try {
      const r = await client.availability(serviceVersionId, date);
      setSlots(r.slots);
      setHentet(true);
    } catch {
      setHentet(true);
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
      if (instrument) void client.track('widget.booking.submitted', { step: 'confirm', locale });
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
    fontSize: 16,
    marginBottom: 10,
  };

  if (state.status === 'loading') {
    return (
      <div style={{ padding: 16, fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
        {locale === 'no' ? 'Henter tjenester …' : 'Loading services…'}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: `var(--ew-fg, ${fb.fg})`, marginBottom: 10 }}>
          {locale === 'no' ? 'Kunne ikke hente tjenester.' : 'Could not load services.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid var(--ew-border, ${fb.border})`,
            background: `var(--ew-surface, ${fb.surface})`,
            color: `var(--ew-fg, ${fb.fg})`,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {locale === 'no' ? 'Prøv igjen' : 'Try again'}
        </button>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div style={{ padding: 16, fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
        {locale === 'no'
          ? 'Ingen bookbare tjenester ennå. Legg dem inn under Tjenester.'
          : 'No bookable services yet.'}
      </div>
    );
  }

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
          setHentet(false);
          if (instrument && e.target.value) {
            void client.track('widget.booking.step', { step: 'service', locale });
          }
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
          setHentet(false);
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
                timeZone: 'Europe/Oslo',
              })}
            </button>
          ))}
        </div>
      )}

      {hentet && slots.length === 0 && !error && (
        <p style={{ fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})`, marginBottom: 10 }}>
          {locale === 'no' ? 'Ingen ledige tider denne dagen.' : 'No available times this day.'}
        </p>
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
        <div style={{ marginTop: 8 }}>
          <p style={{ color: 'var(--ew-danger, #f87171)', fontSize: 12, marginBottom: 8 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadSlots()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid var(--ew-border, ${fb.border})`,
              background: `var(--ew-surface, ${fb.surface})`,
              color: `var(--ew-fg, ${fb.fg})`,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {locale === 'no' ? 'Prøv igjen' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Webshop: samme lagerkatalog som /butikk. Feiler lukket uten shop-flagg. */
function ShopPanel({
  client,
  locale,
  instrument,
}: {
  client: WidgetClient;
  locale: 'no' | 'en';
  instrument: boolean;
}) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; items: WidgetShopItem[] }
    | { status: 'blocked'; message: string }
    | { status: 'error' }
  >({ status: 'loading' });

  const last = useCallback(() => {
    setState({ status: 'loading' });
    client
      .shopCatalog()
      .then((r) => {
        setState({ status: 'ready', items: r.items });
        if (instrument) void client.track('widget.shop.viewed', { locale });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '';
        if (/ikke aktiv/i.test(msg)) {
          if (instrument) void client.track('widget.shop.blocked', { locale, reason: 'flag' });
          setState({
            status: 'blocked',
            message:
              locale === 'no'
                ? 'Nettbutikk er ikke aktiv for denne forhandleren.'
                : 'Webshop is not enabled for this dealer.',
          });
          return;
        }
        setState({ status: 'error' });
      });
  }, [client, instrument, locale]);

  useEffect(() => {
    last();
  }, [last]);

  if (state.status === 'loading') {
    return (
      <div style={{ padding: 16, fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
        {locale === 'no' ? 'Henter katalog …' : 'Loading catalog…'}
      </div>
    );
  }
  if (state.status === 'blocked') {
    return (
      <div style={{ padding: 16, fontSize: 13, color: `var(--ew-fg, ${fb.fg})` }}>
        {state.message}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, marginBottom: 10 }}>
          {locale === 'no' ? 'Kunne ikke hente katalogen.' : 'Could not load catalog.'}
        </p>
        <button
          type="button"
          onClick={last}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid var(--ew-border, ${fb.border})`,
            background: `var(--ew-surface, ${fb.surface})`,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {locale === 'no' ? 'Prøv igjen' : 'Try again'}
        </button>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
        {locale === 'no' ? 'Ingen varer i katalogen ennå.' : 'No products in the catalog yet.'}
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 12, display: 'grid', gap: 8 }}>
      {state.items.map((item) => (
        <li
          key={item.id}
          style={{
            padding: 10,
            border: `1px solid var(--ew-border, ${fb.border})`,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600 }}>{item.name}</div>
          <div style={{ color: `var(--ew-fg-muted, ${fb.fgMuted})` }}>
            {item.sku} · {(item.priceMinor / 100).toLocaleString(locale === 'no' ? 'nb-NO' : 'en')}{' '}
            kr
            {item.available ? '' : locale === 'no' ? ' · ikke på lager' : ' · out of stock'}
          </div>
        </li>
      ))}
    </ul>
  );
}
