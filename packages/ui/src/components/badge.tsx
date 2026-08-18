import { cn } from '@endwise/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

/*
 * shadcn/ui Badge (New York). Erstatter den gamle primitiv-Badgen (F0-12-notat:
 * «dekker shadcn dem, skal de bort»).
 *
 * ⚠️ AVVIK FRA KANONISK shadcn: FORM-en følger eierens badge-spec — 20px høyde,
 * 6px radius — mens `variant` styrer farge. `default` leser aksent-tokenene,
 * som ble SVARTE 06.08.2026. `destructive` er rød og brukes av «New»-badgen.
 * API-et er uendret.
 */
const badgeVariants = cva(
  'inline-flex h-badge w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-badge border px-2 font-medium text-[11px] leading-none transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent-soft text-accent-strong',
        secondary: 'border-transparent bg-secondary text-fg-muted',
        destructive: 'border-transparent bg-danger-soft text-danger',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

export function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
