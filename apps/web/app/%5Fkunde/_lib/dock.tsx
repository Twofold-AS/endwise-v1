'use client';

import { CalendarCheck, CircleUser, Home, ListeRad, MessageSquare } from '@endwise/ui';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ronnySizeForSirkel } from '../../(app)/_shell/phone-chrome.ts';
import { RONNY_PHONE_IDLE, RonnyBot } from '../../(app)/_workshop/ronny-bot.tsx';
import { KundeBunnArk } from './ark.tsx';
import { GlassDock } from './bencho/GlassDock.tsx';
import { KUNDE_DOCK, kundeFaneAktiv } from './faner.ts';

const IKON = {
  hjem: Home,
  bookinger: CalendarCheck,
  meldinger: MessageSquare,
  profil: CircleUser,
} as const;

function RonnyDockIkon({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return <RonnyBot size={ronnySizeForSirkel(size)} idleSett={RONNY_PHONE_IDLE} />;
}

export function KundeDock() {
  const path = usePathname() ?? '/';
  const [ronny, setRonny] = useState(false);
  const aktiv = KUNDE_DOCK.find((f) => kundeFaneAktiv(path, f.href))?.ikon ?? 'hjem';

  return (
    <>
      <div
        data-kunde-dock-rad
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <div
          data-bencho-dock
          data-theme="light"
          data-surface="glass"
          data-stroke="on"
          className="pointer-events-auto flex items-end"
        >
          <div data-kunde-dock>
            <GlassDock
              items={KUNDE_DOCK.map((f) => ({
                key: f.ikon,
                label: f.label,
                Icon: IKON[f.ikon],
              }))}
              active={aktiv}
              onSelect={(key) => {
                const fane = KUNDE_DOCK.find((f) => f.ikon === key);
                if (fane) window.location.assign(fane.href);
              }}
            />
          </div>
          <div data-kunde-ronny-dock className="ml-2.5">
            <GlassDock
              items={[{ key: 'ronny', label: 'Ronny', Icon: RonnyDockIkon }]}
              active={ronny ? 'ronny' : ''}
              onSelect={() => setRonny(true)}
            />
          </div>
        </div>
      </div>

      <KundeBunnArk tittel="Ronny" apen={ronny} onLukk={() => setRonny(false)}>
        <div data-kunde-ronny-ark className="flex flex-col gap-3">
          <p className="text-body text-fg-muted max-md:text-[16px]">
            Hei, jeg er Ronny. Jeg kan vise deg bookinger, meldinger og profil.
          </p>
          <ListeRad tittel="Bookinger" undertekst="Timer og jobber" href="/bookinger" />
          <ListeRad tittel="Meldinger" undertekst="Skriv til verkstedet" href="/meldinger" />
          <ListeRad tittel="Bestill time" undertekst="Når du trenger service" href="/bestill" />
        </div>
      </KundeBunnArk>
    </>
  );
}
