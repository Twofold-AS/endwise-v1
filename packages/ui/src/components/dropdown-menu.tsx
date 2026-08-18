'use client';

import { cn } from '@endwise/ui/lib/utils';
import { DropdownMenu as Primitive } from 'radix-ui';
import type * as React from 'react';

/*
 * shadcn/ui DropdownMenu (New York) på `radix-ui` — samme primitiv shadcn selv
 * bruker, og allerede en avhengighet av denne pakken.
 *
 * ⚠️ Ligger her og ikke i `apps/web` med vilje: UI-PAKKER §5 sier apper ikke
 * importerer primitivbiblioteket direkte. Da finnes det ett sted å endre
 * dropdown-utseendet, og appen slipper å deklarere `radix-ui` selv.
 *
 * Mål følger eierens spec: rader 40px, radius 10px, label 13/16.
 */
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuPortal = Primitive.Portal;
export const DropdownMenuGroup = Primitive.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[220px] overflow-hidden rounded-xl border border-border bg-bg p-1 shadow-lg',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'flex h-row cursor-pointer select-none items-center gap-2.5 rounded-control px-2 text-label outline-none',
        'data-[highlighted]:bg-sidebar-active data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-[11px] text-fg-muted uppercase tracking-wide', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Separator>) {
  return (
    <Primitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/**
 * FELLES POPUP-MØNSTER (06.08.2026, eierens spec).
 *
 * Hver flyout som åpner ut fra sidebaren starter likt: **navnet på punktet**,
 * en **stiplet** skillelinje, og så radene. Den stiplede linja er valgt med
 * vilje — den skiller uten å veie like tungt som kanten rundt selve popupen,
 * så headeren leses som en overskrift og ikke som en egen seksjon.
 *
 * Ligger her og ikke i sidebaren fordi mønsteret er felles: én endring her
 * endrer alle flyouts.
 */
export function DropdownMenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DropdownMenuLabel>{children}</DropdownMenuLabel>
      <div className="-mx-1 mb-1 border-border border-t border-dashed" />
    </>
  );
}
