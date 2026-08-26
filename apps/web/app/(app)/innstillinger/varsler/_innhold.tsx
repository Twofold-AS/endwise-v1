'use client';

import { Bell, Mail, MessageSquare, Switch } from '@endwise/ui';

/**
 * Settings › Varsler. Konfigurasjon av kanaler.
 * Notifikasjons-senteret (F5-08, klokka med dropdown) hører ikke hjemme her
 * det er en flate, ikke en innstilling. Telleren ligger i sidebarens toppseksjon.
 * Status: skall. Bryterne er lokal tilstand — det finnes ingen tRPC-rute for
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

const STANDARD: Record<string, boolean> = { sms: true, epost: true, push: false };

export function VarslerInnhold() {
  return (
    <div className="flex flex-col gap-5">
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
              checked={STANDARD[k.key]}
              disabled
              aria-disabled
              aria-label={`${k.title} kan ikke endres ennå`}
            />
          </div>
        ))}
      </div>

      <p className="text-[12px] text-fg-muted">
        Bryterne er skrudd av til valgene kan lagres. Utsendingen av SMS og e-post er på plass;
        preferanserute kommer senere.
      </p>
    </div>
  );
}
