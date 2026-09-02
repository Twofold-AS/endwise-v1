'use client';

import { cn } from '@endwise/ui/lib/utils';
import { Dialog as Primitive } from 'radix-ui';
import type * as React from 'react';

/*
 * shadcn/ui Dialog (New York) på `radix-ui`. Samme begrunnelse som
 * dropdown-menu.tsx: primitivet bor i pakken, ikke i appen.
 * `DialogContent` er bevisst uten posisjonering — kommandopaletten vil ligge
 * øverst på skjermen, ikke sentrert. Kallstedet bestemmer plasseringen; denne
 * gir kun ramme, overlegg og tilgjengelighet.
 */
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/25', className)}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <DialogOverlay />
      <Primitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed z-50 overflow-hidden rounded-xl border border-border bg-bg',
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
