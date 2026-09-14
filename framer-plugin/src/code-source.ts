/**
 * Framer Code Component-kilde (F4-09).
 * Framer løser bare `react` / `framer` / `framer-motion` som bare imports.
 * Derfor er dette et tynt skall mot `/widget/*` — samme kontrakt som widget-ui,
 * uten workspace-imports. Ingen tenantId, ingen sk_-nøkler.
 */
export const ENDWISE_CODE_FILE_NAME = 'Endwise';

export const ENDWISE_FRAMER_COMPONENT = `import { addPropertyControls, ControlType } from "framer"
import { useCallback, useEffect, useRef, useState } from "react"

const MODES = ["booking", "ai", "tracking", "webshop"]

function rejectSecret(key) {
  const v = String(key || "").trim()
  if (!v || /^sk_/i.test(v) || /secret/i.test(v)) return ""
  return v.startsWith("pk_") ? v : ""
}

async function authed(apiBase, publishableKey, tokenRef, path, init) {
  async function initToken() {
    const res = await fetch(apiBase + "/widget/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publishableKey }),
    })
    if (!res.ok) throw new Error(res.status === 403 ? "origin" : "init")
    const data = await res.json()
    tokenRef.current = { token: data.token, shop: data.capabilities?.shop === true }
    return data
  }
  if (!tokenRef.current?.token) await initToken()
  const res = await fetch(apiBase + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + tokenRef.current.token,
      ...(init && init.headers ? init.headers : {}),
    },
  })
  if (res.status === 401) {
    tokenRef.current = null
    await initToken()
    return authed(apiBase, publishableKey, tokenRef, path, init)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || "request")
  }
  return res.json()
}

export default function Endwise(props) {
  const publishableKey = rejectSecret(props.publishableKey)
  const apiBase = String(props.apiBase || "https://endwise.no").replace(/\\/+$/, "")
  const mode = MODES.includes(props.mode) ? props.mode : "booking"
  const locale = props.locale === "en" ? "en" : "no"
  const trackEvents = props.trackEvents !== false || mode === "tracking"
  const tokenRef = useRef(null)
  const [status, setStatus] = useState(publishableKey ? "boot" : "need-key")
  const [detail, setDetail] = useState("")
  const [services, setServices] = useState([])
  const [items, setItems] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  const vars = {
    ["--ew-bg"]: props.background || "#ffffff",
    ["--ew-fg"]: props.foreground || "#333333",
    ["--ew-accent"]: props.accent || "#111111",
    fontFamily: "system-ui, sans-serif",
    background: props.background || "#ffffff",
    color: props.foreground || "#333333",
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    width: "100%",
    maxWidth: 420,
    minHeight: 160,
    overflow: "hidden",
  }

  const track = useCallback(
    (name, extra) => {
      if (!trackEvents || !publishableKey) return
      void authed(apiBase, publishableKey, tokenRef, "/widget/events", {
        method: "POST",
        body: JSON.stringify({ name, props: { mode, locale, ...(extra || {}) } }),
      }).catch(() => undefined)
    },
    [apiBase, locale, mode, publishableKey, trackEvents],
  )

  useEffect(() => {
    if (!publishableKey) {
      setStatus("need-key")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const boot = await authed(apiBase, publishableKey, tokenRef, "/widget/services")
        if (cancelled) return
        setServices(boot.services || [])
        track("widget.viewed")
        if (mode === "webshop") {
          try {
            const shop = await authed(apiBase, publishableKey, tokenRef, "/widget/shop/catalog")
            if (cancelled) return
            setItems(shop.items || [])
            track("widget.shop.viewed")
            setStatus("shop")
          } catch (e) {
            if (cancelled) return
            track("widget.shop.blocked", { reason: "flag" })
            setStatus("shop-blocked")
            setDetail(e instanceof Error ? e.message : "")
          }
          return
        }
        setStatus("ready")
      } catch (e) {
        if (cancelled) return
        setStatus(e instanceof Error && e.message === "origin" ? "origin" : "error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, mode, publishableKey, track])

  async function sendChat() {
    const text = input.trim()
    if (!text || busy) return
    setInput("")
    setMessages((m) => [...m, { from: "you", text }])
    setBusy(true)
    track("widget.chat.sent")
    try {
      const reply = await authed(apiBase, publishableKey, tokenRef, "/widget/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, locale }),
      })
      setMessages((m) => [...m, { from: "ai", text: reply.reply }])
    } catch {
      setMessages((m) => [...m, { from: "ai", text: locale === "no" ? "Beklager, noe gikk galt." : "Something went wrong." }])
    } finally {
      setBusy(false)
    }
  }

  const label = props.dealerLabel ? String(props.dealerLabel) : ""

  return (
    <div style={vars}>
      {label ? (
        <div style={{ padding: "8px 12px", fontSize: 11, color: "#777" }}>{label}</div>
      ) : null}
      {status === "need-key" ? (
        <p style={{ padding: 16, fontSize: 13 }}>Lim inn publishable key (pk_live_…) i Property Controls.</p>
      ) : null}
      {status === "origin" ? (
        <p style={{ padding: 16, fontSize: 13 }}>
          Origin er ikke registrert på nøkkelen. Legg til denne sidens origin i Admin → Widget.
        </p>
      ) : null}
      {status === "error" ? (
        <p style={{ padding: 16, fontSize: 13 }}>Kunne ikke starte widget (init). Sjekk nøkkel og API-base.</p>
      ) : null}
      {status === "shop-blocked" ? (
        <p style={{ padding: 16, fontSize: 13 }}>
          {detail || (locale === "no" ? "Nettbutikk er ikke aktiv for denne forhandleren." : "Webshop is not enabled.")}
        </p>
      ) : null}
      {status === "shop" ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 12 }}>
          {items.length === 0 ? <li style={{ fontSize: 13 }}>Ingen varer i katalogen ennå.</li> : null}
          {items.map((item) => (
            <li key={item.id} style={{ padding: 8, border: "1px solid #e5e5e5", borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
              <strong>{item.name}</strong>
              <div style={{ color: "#777" }}>{item.sku}</div>
            </li>
          ))}
        </ul>
      ) : null}
      {status === "ready" && (mode === "ai" || mode === "tracking") ? (
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>
            Du snakker nå med en AI-assistent, ikke et menneske. Du kan når som helst be om å bli satt over til en medarbeider.
          </div>
          {mode === "tracking" ? (
            <div style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>Funnel-måling på (uten cookies).</div>
          ) : null}
          <div style={{ minHeight: 80 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                {m.from === "you" ? "Du: " : "AI: "}
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} style={{ flex: 1, fontSize: 16, padding: 8 }} />
            <button type="button" onClick={sendChat} disabled={busy}>
              Send
            </button>
          </div>
        </div>
      ) : null}
      {status === "ready" && (mode === "booking" || mode === "tracking") ? (
        <BookingShell apiBase={apiBase} publishableKey={publishableKey} tokenRef={tokenRef} locale={locale} services={services} track={track} />
      ) : null}
    </div>
  )
}

function BookingShell(props) {
  const [serviceVersionId, setServiceVersionId] = useState("")
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date()))
  const [slots, setSlots] = useState([])
  const [chosen, setChosen] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [done, setDone] = useState("")
  const [error, setError] = useState("")

  async function loadSlots() {
    setError("")
    setSlots([])
    setChosen("")
    if (!serviceVersionId) return
    props.track("widget.booking.step", { step: "availability" })
    try {
      const r = await authed(props.apiBase, props.publishableKey, props.tokenRef, "/widget/availability?serviceVersionId=" + encodeURIComponent(serviceVersionId) + "&date=" + date)
      setSlots(r.slots || [])
    } catch {
      setError(props.locale === "no" ? "Kunne ikke hente ledige tider" : "Could not load availability")
    }
  }

  async function book() {
    setError("")
    try {
      const r = await authed(props.apiBase, props.publishableKey, props.tokenRef, "/widget/booking", {
        method: "POST",
        body: JSON.stringify({ serviceVersionId, startsAt: chosen, customer: { name, phone } }),
      })
      props.track("widget.booking.submitted", { step: "confirm" })
      setDone(r.bookingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "booking")
    }
  }

  if (done) return <div style={{ padding: 16, fontSize: 14 }}>Forespørsel sendt! Vi bekrefter på SMS.</div>

  return (
    <div style={{ padding: 16, fontSize: 13 }}>
      <div>Tjeneste</div>
      <select
        value={serviceVersionId}
        onChange={(e) => {
          setServiceVersionId(e.target.value)
          setSlots([])
          setChosen("")
          if (e.target.value) props.track("widget.booking.step", { step: "service" })
        }}
        style={{ width: "100%", marginBottom: 8, fontSize: 16 }}
      >
        <option value="">Velg…</option>
        {props.services.map((s) => (
          <option key={s.serviceVersionId} value={s.serviceVersionId}>
            {s.name}
          </option>
        ))}
      </select>
      <div>Dato</div>
      <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSlots([]); setChosen("") }} style={{ width: "100%", marginBottom: 8, fontSize: 16 }} />
      <button type="button" onClick={loadSlots} disabled={!serviceVersionId}>
        Vis ledige tider
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
        {slots.map((s) => (
          <button type="button" key={s} onClick={() => setChosen(s)}>
            {new Date(s).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" })}
          </button>
        ))}
      </div>
      {chosen ? (
        <>
          <div>Navn</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginBottom: 8, fontSize: 16 }} />
          <div>Telefon</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", marginBottom: 8, fontSize: 16 }} />
          <button type="button" onClick={book} disabled={!name || !phone}>
            Send booking-forespørsel
          </button>
        </>
      ) : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
    </div>
  )
}

addPropertyControls(Endwise, {
  mode: {
    type: ControlType.Enum,
    title: "Modus",
    options: ["booking", "ai", "tracking", "webshop"],
    optionTitles: ["Booking", "AI", "Tracking", "Webshop"],
    defaultValue: "booking",
  },
  publishableKey: { type: ControlType.String, title: "Publishable key", placeholder: "pk_live_…" },
  apiBase: { type: ControlType.String, title: "API-base", defaultValue: "https://endwise.no" },
  dealerLabel: { type: ControlType.String, title: "Forhandler" },
  locale: {
    type: ControlType.Enum,
    title: "Språk",
    options: ["no", "en"],
    optionTitles: ["Norsk", "English"],
    defaultValue: "no",
  },
  trackEvents: { type: ControlType.Boolean, title: "Funnel", defaultValue: true },
  accent: { type: ControlType.Color, title: "Aksent", defaultValue: "#111111" },
  background: { type: ControlType.Color, title: "Bakgrunn", defaultValue: "#ffffff" },
  foreground: { type: ControlType.Color, title: "Tekst", defaultValue: "#333333" },
})
`;

export function canvasControls(config: {
  publishableKey: string;
  apiBase: string;
  dealerLabel: string;
  mode: string;
  trackEvents: boolean;
}) {
  return {
    mode: config.mode,
    publishableKey: config.publishableKey,
    apiBase: config.apiBase,
    dealerLabel: config.dealerLabel,
    locale: 'no',
    trackEvents: config.trackEvents,
  };
}
