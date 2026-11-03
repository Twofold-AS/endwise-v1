'use client';

import {
  DeaktivertHandling,
  Dropdown,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from '@endwise/ui';
import type { ReactNode } from 'react';

export type RadHandling = {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  forklaring?: string;
};

/** Synlig ⋯ på rad. Long-press er snarvei, ikke eneste vei. */
export function RadMeny({
  label,
  handlinger,
}: {
  label: string;
  handlinger: readonly RadHandling[];
}) {
  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={`Flere handlinger for ${label}`}
        data-rad-meny
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-title text-fg hover:bg-surface-2"
        onClick={(e) => e.stopPropagation()}
      >
        ⋯
      </DropdownTrigger>
      <DropdownPopover aria-label={`Handlinger for ${label}`} placement="bottom end">
        {handlinger.map((h) =>
          h.disabled ? (
            <div key={h.id} className="px-2 py-1">
              <DeaktivertHandling forklaring={h.forklaring ?? 'Kommer senere'}>
                {h.label}
              </DeaktivertHandling>
            </div>
          ) : (
            <DropdownItem key={h.id} onSelect={h.onSelect}>
              {h.label}
            </DropdownItem>
          ),
        )}
      </DropdownPopover>
    </Dropdown>
  );
}

export function RadMedMeny({
  children,
  meny,
}: {
  children: ReactNode;
  meny: ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-1">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center">{meny}</div>
    </div>
  );
}
