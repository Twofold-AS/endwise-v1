'use client';

import { cn } from '@endwise/ui/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';
import type * as React from 'react';

/*
 * shadcn/ui Switch (New York), bygget på `radix-ui`s Switch — samme primitiv
 * shadcn selv bruker, og allerede en avhengighet. Ikke egen kode i betydningen
 * «ny primitiv»; kun shadcn-oppskriften med eierens mål.
 *
 * MÅL (eierens designprinsipper 03.08.2026, låst i widget-tokens):
 *   track 24×14px · thumb 10px · track-på #0077E6
 *
 * Merk at track-farge-på er en EGEN blå (`--ew-switch-track-on`), ikke
 * merkevareaksenten. Det er spesifisert slik, og det er faktisk fornuftig: en
 * bryter som er på skal lese som «på», ikke som «Endwise».
 */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[var(--ew-switch-h)] w-[var(--ew-switch-w)] shrink-0 items-center rounded-pill border border-transparent p-[2px] outline-none transition-colors',
        'bg-border data-[state=checked]:bg-switch-on',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-[var(--ew-switch-thumb)] rounded-pill bg-white shadow-sm ring-0 transition-transform',
          // Vandring = bredde − thumb − 2×padding = 24 − 10 − 4 = 10px.
          // Literal, ikke calc(var(…)): Tailwind kan generere klassen, men et
          // arbitrært calc over CSS-variabler er en unødvendig indirekte vei for
          // ett tall som uansett må regnes om hvis noen av de tre endres.
          'translate-x-0 data-[state=checked]:translate-x-[10px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
