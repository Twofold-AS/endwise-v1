import { EndwiseWidget } from '@endwise/widget-ui';
import { framer } from 'framer-plugin';
import { type CSSProperties, useEffect, useState } from 'react';
import {
  DEFAULT_API_BASE,
  normalizeConfig,
  PLUGIN_DATA,
  parseMode,
  validatePublishableKey,
  WIDGET_MODES,
  type WidgetMode,
} from './config.ts';
import { insertEndwiseComponent } from './insert.ts';

const MODE_LABEL: Record<WidgetMode, string> = {
  booking: 'Booking',
  ai: 'AI',
  tracking: 'Tracking',
  webshop: 'Webshop',
};

type InitSmoke =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'ok'; shop: boolean }
  | { status: 'origin' }
  | { status: 'bad-key' }
  | { status: 'error'; message: string };

/**
 * F4-01/F4-09 — plugin-panel. Lim inn pk_ + API-base. Tenant velges av nøkkelen.
 * OTP/QR-pairing er bevisst ute (fortsatt TODO). Ingen hemmelige nøkler.
 */
export function App() {
  const [publishableKey, setPublishableKey] = useState('');
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [dealerLabel, setDealerLabel] = useState('');
  const [mode, setMode] = useState<WidgetMode>('booking');
  const [trackEvents, setTrackEvents] = useState(true);
  const [saved, setSaved] = useState(false);
  const [smoke, setSmoke] = useState<InitSmoke>({ status: 'idle' });
  const [insertMsg, setInsertMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    void (async () => {
      const key = (await framer.getPluginData(PLUGIN_DATA.publishableKey)) ?? '';
      const base = (await framer.getPluginData(PLUGIN_DATA.apiBase)) ?? DEFAULT_API_BASE;
      const label = (await framer.getPluginData(PLUGIN_DATA.dealerLabel)) ?? '';
      const storedMode = await framer.getPluginData(PLUGIN_DATA.mode);
      const storedTrack = await framer.getPluginData(PLUGIN_DATA.trackEvents);
      setPublishableKey(key);
      setApiBase(base || DEFAULT_API_BASE);
      setDealerLabel(label);
      setMode(parseMode(storedMode));
      setTrackEvents(storedTrack !== '0');
    })();
  }, []);

  const parsed = normalizeConfig({ publishableKey, apiBase, dealerLabel, mode, trackEvents });
  const keyIssue = validatePublishableKey(publishableKey);

  async function save() {
    if (!parsed.ok) return;
    await framer.setPluginData(PLUGIN_DATA.publishableKey, parsed.config.publishableKey);
    await framer.setPluginData(PLUGIN_DATA.apiBase, parsed.config.apiBase);
    await framer.setPluginData(PLUGIN_DATA.dealerLabel, parsed.config.dealerLabel);
    await framer.setPluginData(PLUGIN_DATA.mode, parsed.config.mode);
    await framer.setPluginData(PLUGIN_DATA.trackEvents, parsed.config.trackEvents ? '1' : '0');
    setSaved(true);
    setApiBase(parsed.config.apiBase);
  }

  async function smokeInit() {
    if (!parsed.ok) return;
    setSmoke({ status: 'busy' });
    try {
      const res = await fetch(`${parsed.config.apiBase}/widget/init`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publishableKey: parsed.config.publishableKey }),
      });
      if (res.status === 401) {
        setSmoke({ status: 'bad-key' });
        return;
      }
      if (res.status === 403) {
        setSmoke({ status: 'origin' });
        return;
      }
      if (!res.ok) {
        setSmoke({ status: 'error', message: `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { capabilities?: { shop?: boolean }; tenantId?: unknown };
      if ('tenantId' in data && data.tenantId) {
        setSmoke({ status: 'error', message: 'API lekket tenantId — avbrutt' });
        return;
      }
      setSmoke({ status: 'ok', shop: data.capabilities?.shop === true });
    } catch (e) {
      setSmoke({
        status: 'error',
        message: e instanceof Error ? e.message : 'Nettverksfeil',
      });
    }
  }

  async function insert() {
    if (!parsed.ok) return;
    setInsertMsg(null);
    try {
      await save();
      await insertEndwiseComponent(parsed.config);
      setInsertMsg('Komponenten ligger på lerretet.');
    } catch (e) {
      setInsertMsg(e instanceof Error ? e.message : 'Kunne ikke sette inn komponenten.');
    }
  }

  const field: CSSProperties = { width: '100%', boxSizing: 'border-box' };

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        display: 'grid',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, color: '#888' }}>
        Lim inn forhandlerens publishable key (Admin → Organisasjon → Integrasjoner / Widget).
        Nøkkelen velger forhandler. Ingen hemmelig nøkkel, ingen tenantId.
      </p>

      <label>
        Publishable key
        <input
          value={publishableKey}
          onChange={(e) => {
            setPublishableKey(e.target.value);
            setSaved(false);
          }}
          placeholder="pk_live_…"
          autoComplete="off"
          spellCheck={false}
          style={field}
        />
      </label>
      {keyIssue === 'secret' && (
        <span style={{ color: '#b91c1c' }}>Hemmelige nøkler (sk_…) er ikke tillatt i Framer.</span>
      )}

      <label>
        API-base
        <input
          value={apiBase}
          onChange={(e) => {
            setApiBase(e.target.value);
            setSaved(false);
          }}
          placeholder={DEFAULT_API_BASE}
          style={field}
        />
      </label>
      <span style={{ color: '#888', fontSize: 12 }}>
        Prod: {DEFAULT_API_BASE} · lokal: http://localhost:3000
      </span>

      <label>
        Forhandler (valgfri merkelapp)
        <input
          value={dealerLabel}
          onChange={(e) => setDealerLabel(e.target.value)}
          placeholder="F.eks. Oslo MC"
          style={field}
        />
      </label>

      <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, margin: 0 }}>
        <legend>Modus</legend>
        {WIDGET_MODES.map((m) => (
          <label key={m} style={{ display: 'inline-flex', gap: 6, marginRight: 10 }}>
            <input
              type="radio"
              name="mode"
              checked={mode === m}
              onChange={() => {
                setMode(m);
                setSaved(false);
              }}
            />
            {MODE_LABEL[m]}
          </label>
        ))}
      </fieldset>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={trackEvents || mode === 'tracking'}
          onChange={(e) => setTrackEvents(e.target.checked)}
        />
        Funnel-hendelser (cookieless, F4-14)
      </label>

      <button type="button" onClick={() => void save()} disabled={!parsed.ok}>
        Lagre i prosjektet
      </button>
      {saved && <span style={{ color: '#1ed27d' }}>Lagret ✓</span>}

      <button type="button" onClick={() => void smokeInit()} disabled={!parsed.ok}>
        Test /widget/init
      </button>
      {smoke.status === 'ok' && (
        <span style={{ color: '#1ed27d' }}>
          Init OK. Forhandler bundet via nøkkelen.
          {smoke.shop ? ' Shop-flagg: på.' : ' Shop-flagg: av (webshop feiler lukket).'}
        </span>
      )}
      {smoke.status === 'origin' && (
        <span style={{ color: '#b45309' }}>
          403: origin er ikke på nøkkelens allowlist. Registrer Framer-preview/publisert origin
          (eksakt https://vert, ingen wildcard).
        </span>
      )}
      {smoke.status === 'bad-key' && (
        <span style={{ color: '#b91c1c' }}>401: ukjent eller inaktiv nøkkel.</span>
      )}
      {smoke.status === 'error' && <span style={{ color: '#b91c1c' }}>{smoke.message}</span>}

      <button type="button" onClick={() => void insert()} disabled={!parsed.ok}>
        Sett inn {MODE_LABEL[mode]}-komponent
      </button>
      {insertMsg && <span style={{ color: '#555' }}>{insertMsg}</span>}

      <button type="button" onClick={() => setPreview((v) => !v)} disabled={!parsed.ok}>
        {preview ? 'Skjul forhåndsvisning' : 'Forhåndsvis widget-ui'}
      </button>
      {preview && parsed.ok && (
        <EndwiseWidget
          key={`${parsed.config.publishableKey}-${parsed.config.mode}`}
          apiBase={parsed.config.apiBase}
          publishableKey={parsed.config.publishableKey}
          mode={parsed.config.mode}
          trackEvents={parsed.config.trackEvents || parsed.config.mode === 'tracking'}
          locale="no"
        />
      )}
    </main>
  );
}
