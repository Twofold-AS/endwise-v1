'use client';

import { Button } from '@endwise/ui/components/button';
import { cn } from '@endwise/ui/lib/utils';
import {
  MessageScroller as Primitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from '@shadcn/react/message-scroller';
import { ArrowDown } from 'lucide-react';
import type * as React from 'react';

/*
 * shadcn/ui `message-scroller` (New York), hentet 12.08.2026 med
 * `npx shadcn@latest view message-scroller`. Se UI-PAKKER.md §9.
 *
 * ── Hvorfor den er verdt en avhengighet ──────────────────────────────────
 * «Rull til bunnen når det kommer noe nytt» høres ut som fem linjer, og er det
 * ikke. Den må slutte å følge etter i det brukeren scroller opp, ta det opp
 * igjen når de er tilbake på bunnen, ikke hoppe når eldre meldinger lastes inn
 * over, og holde posisjonen mens tokens strømmer inn og endrer høyden
 * kontinuerlig. Oppførselen ligger i `@shadcn/react` (MIT, 56 kB, NULL
 * avhengigheter) — denne fila er bare stil.
 *
 * ── ⚠️ Avvik fra oppstrøms, og hvorfor ───────────────────────────────────
 * 1. **Fire utility-klasser fjernet fra viewporten:** `scroll-fade-b`,
 *    `scrollbar-thin`, `scrollbar-gutter-stable` og
 *    `data-autoscrolling:scrollbar-none`. Ingen av dem finnes i vårt
 *    Tailwind-oppsett — de er shadcns egne. Beholdt ville de vært klasser som
 *    ikke gjør noe, altså kode som ser ut til å virke. Trenger vi dem, defineres
 *    de i `theme.css` som ekte utilities.
 * 2. **`ArrowDownIcon` → `ArrowDown`** fra vår ikon-barrel-konvensjon.
 * 3. **Norsk skjermlesertekst.** Oppstrøms har «Scroll to end».
 * 4. `render={<Button/>}`-mønsteret er beholdt: primitivet fra `@shadcn/react`
 *    støtter `render`, og vår `Button` har allerede `secondary` + `icon-sm`.
 */

export const MessageScrollerProvider = Primitive.Provider;

export function MessageScroller({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="message-scroller"
      className={cn(
        'group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

export function MessageScrollerViewport({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Viewport>) {
  return (
    <Primitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn('size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain', className)}
      {...props}
    />
  );
}

export function MessageScrollerContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      data-slot="message-scroller-content"
      className={cn('flex h-max min-h-full flex-col gap-6', className)}
      {...props}
    />
  );
}

export function MessageScrollerItem({
  className,
  scrollAnchor = false,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="message-scroller-item"
      scrollAnchor={scrollAnchor}
      className={cn('min-w-0 shrink-0', className)}
      {...props}
    />
  );
}

/** «Hopp til nyeste». Skjuler seg selv når du allerede står nederst. */
export function MessageScrollerButton({
  direction = 'end',
  className,
  children,
  render,
  ...props
}: React.ComponentProps<typeof Primitive.Button>) {
  return (
    <Primitive.Button
      data-slot="message-scroller-button"
      data-direction={direction}
      direction={direction}
      className={cn(
        '-translate-x-1/2 absolute bottom-4 left-1/2 z-10 transition-all duration-200',
        'data-[active=false]:pointer-events-none data-[active=false]:translate-y-2 data-[active=false]:opacity-0',
        'data-[active=true]:translate-y-0 data-[active=true]:opacity-100',
        'data-[direction=start]:top-4 data-[direction=start]:bottom-auto [&_svg]:data-[direction=start]:rotate-180',
        className,
      )}
      render={render ?? <Button variant="secondary" size="icon-sm" />}
      {...props}
    >
      {children ?? (
        <>
          <ArrowDown />
          <span className="sr-only">
            {direction === 'end' ? 'Hopp til nyeste melding' : 'Hopp til første melding'}
          </span>
        </>
      )}
    </Primitive.Button>
  );
}

export { useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility };
