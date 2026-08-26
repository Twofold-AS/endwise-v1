import { framer } from 'framer-plugin';
import { useState } from 'react';

/**
 * Framer Plugin-skall (skjelett, status `progress`).
 * Jobb (per roadmap): pairing (OTP/QR) → nøkkelutstedelse, plugin storage,
 * tenant-config UI. Denne versjonen er det minimale skallet: forhandleren limer
 * inn sin publishable key (hentet i admin → Integrasjoner → Widget) + API-base,
 * som lagres i plugin storage og settes som Property Controls på Code Component-en
 * (F4-09). Gjenstår: ekte pairing-flyt (OTP/QR mot Endwise-admin), Code File
 * API-synk (F4-11), multi-tenant MCP (F4-12). Ingen hemmelig nøkkel her (CWE-798).
 */
export function App() {
  const [publishableKey, setPublishableKey] = useState('');
  const [apiBase, setApiBase] = useState('https://api.endwise.no');
  const [saved, setSaved] = useState(false);

  async function save() {
    // Plugin storage — trygt for offentlig publishable key + apiBase (ikke hemmelig).
    await framer.setPluginData('endwise:publishableKey', publishableKey.trim());
    await framer.setPluginData('endwise:apiBase', apiBase.trim());
    setSaved(true);
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', fontSize: 13, display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15 }}>Endwise Booking</h2>
      <p style={{ margin: 0, color: '#888' }}>
        Lim inn forhandlerens publishable key (Admin → Integrasjoner → Widget). Den er offentlig og
        trygg i en publisert side.
      </p>
      <label>
        Publishable key
        <input
          value={publishableKey}
          onChange={(e) => setPublishableKey(e.target.value)}
          placeholder="pk_live_…"
          style={{ width: '100%' }}
        />
      </label>
      <label>
        API-base
        <input
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          style={{ width: '100%' }}
        />
      </label>
      <button type="button" onClick={save} disabled={!publishableKey.startsWith('pk_')}>
        Lagre
      </button>
      {saved && <span style={{ color: '#1ed27d' }}>Lagret ✓</span>}
    </main>
  );
}
