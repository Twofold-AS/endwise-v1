'use client';

import {
  CalendarDays,
  CommandPalette,
  CommandPaletteItem,
  CommandPaletteSection,
  Inbox,
  LayoutDashboard,
  Package,
  Store,
  Tags,
  Users,
} from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MAL = [
  { id: 'home', href: '/home', label: 'Hjem', icon: LayoutDashboard },
  { id: 'kunder', href: '/kunder', label: 'Kunder', icon: Users },
  { id: 'jobber', href: '/jobber', label: 'Timeplan', icon: CalendarDays },
  { id: 'innboks', href: '/innboks', label: 'Innboks', icon: Inbox },
  { id: 'lager', href: '/lager', label: 'Lager', icon: Package },
  { id: 'butikk', href: '/butikk', label: 'Butikk', icon: Store },
  { id: 'prisliste', href: '/prisliste', label: 'Tjenester', icon: Tags },
] as const;

/** Desktop ⌘K. Ikke i Claude — forsterkning utenfor fasiten. */
export function Kommandopalett() {
  const router = useRouter();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!desktop) return null;

  return (
    <CommandPalette
      aria-label="Hurtigsøk"
      placeholder="Søk i Endwise"
      emptyState="Ingen treff."
      footer={
        <>
          <span>Gå med piltaster</span>
          <span>Velg med Enter</span>
        </>
      }
    >
      <CommandPaletteSection title="Sider">
        {MAL.map((m) => (
          <CommandPaletteItem
            key={m.id}
            id={m.id}
            icon={m.icon}
            onAction={() => router.push(m.href as Route)}
          >
            {m.label}
          </CommandPaletteItem>
        ))}
      </CommandPaletteSection>
    </CommandPalette>
  );
}
