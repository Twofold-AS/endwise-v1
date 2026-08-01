import { cn } from '@endwise/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

// shadcn/ui Badge (New York). Erstatter den gamle primitiv-Badgen (F0-12-notat:
// «dekker shadcn dem, skal de bort»). API: variant=default|secondary|destructive|outline.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 font-medium text-xs transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-white',
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
