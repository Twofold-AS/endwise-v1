import { cn } from '@endwise/ui/lib/utils';
import type * as React from 'react';

/*
 * shadcn/ui `message` (New York), hentet med
 * `npx shadcn@latest view message` og lagt her — samme framgangsmåte som
 * dropdown-menu og dialog. Se ui-pakker.md §9.
 * Hva den er
 * Ren struktur og CSS. **Null avhengigheter** — ingen Radix, ingen
 * `@shadcn/react`, ingen state. Den vet ingenting om AI, om strømming eller om
 * hvem som skrev meldingen; den stabler bare avsender, innhold og fot.
 * Avvik fra oppstrøms, og hvorfor
 * `export function` i stedet for `function` + samlet `export {}` nederst
 * følger resten av `packages/ui`.
 * Ellers **urørt**. Klassene bruker shadcn-semantikken (`bg-muted`,
 * `text-muted-foreground`), som `theme.css` allerede mapper til `--ew-*`.
 * Derfor snur den med temaet uten at vi rører en linje.
 * `align="end"` betyr «min egen melding» (høyrestilt), `start` betyr
 * motpartens. Det er en visuell rolle, ikke en sikkerhetsrolle — hvem som
 * faktisk skrev noe avgjøres på serveren, aldri av denne propen.
 */

export function MessageGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-group"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}

export function Message({
  className,
  align = 'start',
  ...props
}: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        'group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse',
        className,
      )}
      {...props}
    />
  );
}

export function MessageAvatar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        'flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8',
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end',
        className,
      )}
      {...props}
    />
  );
}

export function MessageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0',
        className,
      )}
      {...props}
    />
  );
}

export function MessageFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Selve boblen. **Ikke fra oppstrøms** — shadcn lar deg style
 * `MessageContent` fritt, men da ville hvert kallsted gjentatt bakgrunn, radius
 * og maksbredde, og den femte kopien ville sett litt annerledes ut.
 *
 * `bg-accent-soft` for egne meldinger er samme aksentflate som badges og
 * uleste-telleren (UI-PAKKER §6) — ikke en ny farge.
 */
export function MessageBubble({
  className,
  egen = false,
  ...props
}: React.ComponentProps<'div'> & { egen?: boolean }) {
  return (
    <div
      data-slot="message-bubble"
      className={cn(
        'w-fit max-w-[min(42rem,100%)] rounded-xl px-3 py-2 text-body leading-relaxed',
        egen ? 'bg-accent-soft text-accent-strong' : 'bg-surface-2 text-fg',
        className,
      )}
      {...props}
    />
  );
}
