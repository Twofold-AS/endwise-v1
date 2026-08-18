'use client';

import { Bell, Mail, MessageSquare, Switch } from '@endwise/ui';
import { useState } from 'react';

/**
 * F5-19 — Settings › Varsler. KONFIGURASJON av kanaler.
 *
 * ⚠️ Notifikasjons-SENTERET (F5-08, klokka med dropdown) hører ikke hjemme her —
 * det er en flate, ikke en innstilling. Telleren ligger i sidebarens toppseksjon.
 *
 * STATUS: skall. Bryterne er lokal tilstand — det finnes ingen tRPC-rute for
 * varselpreferanser ennå. Utsendingen (Twilio/Resend via Vercel Workflows,
 * F3-04) er bygget; det er valgene som mangler.
 */
const KANALER = [
  {
    key: 'sms',
    icon: MessageSquare,
    title: 'SMS',
    body: 'Påminnelser og statusendringer til kunden (Twilio).',
  },
  { key: 'epost', icon: Mail, title: 'E-post', body: 'Bekreftelser og kvitteringer (Resend).' },
  { key: 'push', icon: Bell, title: 'Web Push', body: 'Varsler til mekanikerens PWA (F6-12).' },
] as const;

export default function VarslerPage() {
  const [on, setOn] = useState<Record<string, boolean>>({ sms: true, epost: true, push: false });

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Varsler</h1>
        <p className="text-body text-fg-muted">
          Hvilke kanaler verkstedet bruker mot kunder og ansatte.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {KANALER.map((k, i) => (
          <div
            key={k.key}
            className={`flex h-row-store items-center gap-3 bg-bg px-4 ${i > 0 ? 'border-border border-t' : ''}`}
          >
            <k.icon size={16} className="shrink-0 text-fg-muted" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label text-fg">{k.title}</span>
              <span className="truncate text-[12px] text-fg-muted">{k.body}</span>
            </div>
            <Switch
              checked={on[k.key]}
              onCheckedChange={(v) => setOn((s) => ({ ...s, [k.key]: v }))}
              aria-label={`Slå ${on[k.key] ? 'av' : 'på'} ${k.title}`}
            />
          </div>
        ))}
      </div>

      <p className="text-[12px] text-fg-muted">
        Valgene lagres ikke ennå — det mangler en rute for varselpreferanser. Selve utsendingen
        (F3-04) er bygget og idempotent.
      </p>
    </div>
  );
}
