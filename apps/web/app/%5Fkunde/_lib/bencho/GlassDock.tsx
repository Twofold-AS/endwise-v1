'use client';

/**
 * Bencho dock — MIT.
 * Kilde: https://github.com/cabralorenzo/bencho/tree/main/blocks/dock
 * Live: https://bencho.dev/blocks/dock · ?c=dock&theme=light
 *
 * Tilpasset Endwise (F42-05): items/active/onSelect, ikoner via @endwise/ui,
 * Mobbin-kort (24px, hairline, ink). Ingen magnify/bounce/scale ved
 * klikk eller hover — trykk er statisk.
 */
import { FolderOpen, Home, Save, Search, User } from '@endwise/ui';
import { type ComponentType, useState } from 'react';
import './GlassDock.css';
import './tokens.css';

export type GlassDockIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;
export type GlassDockItem = { key: string; label: string; Icon: GlassDockIcon };

const DOCK: GlassDockItem[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'search', label: 'Search', Icon: Search },
  { key: 'files', label: 'Files', Icon: FolderOpen },
  { key: 'saved', label: 'Saved', Icon: Save },
  { key: 'you', label: 'You', Icon: User },
];

export function GlassDock({
  items = DOCK,
  active: activeProp,
  onSelect,
  utenPanel = false,
}: {
  items?: readonly GlassDockItem[];
  active?: string;
  onSelect?: (key: string) => void;
  /** Kundesidens Ronny-boks: ingen hvit panel-bakgrunn, ikonet fyller boksen. */
  utenPanel?: boolean;
}) {
  const [localActive, setLocalActive] = useState(items[0]?.key ?? '');
  const active = activeProp ?? localActive;
  const choose = (key: string) => {
    onSelect?.(key);
    if (activeProp === undefined) setLocalActive(key);
  };

  return (
    <nav
      className="gdock"
      aria-label="Dock"
      data-kunde-dock-statisk
      data-uten-panel={utenPanel || undefined}
    >
      {items.map(({ key, label, Icon }) => (
        <button
          type="button"
          key={key}
          className="gdock-item"
          aria-label={label}
          aria-current={active === key ? 'page' : undefined}
          data-active={active === key}
          data-kunde-dock-dot={active === key ? '1' : '0'}
          onClick={() => choose(key)}
        >
          <span className="gdock-glyph">
            <Icon size={utenPanel ? 44 : 20} strokeWidth={2} />
          </span>
          <span className="gdock-dot" data-on={active === key} />
        </button>
      ))}
    </nav>
  );
}
