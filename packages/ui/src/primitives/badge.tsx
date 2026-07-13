import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';

const badge = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      tone: {
        neutral: 'bg-surface text-fg-muted border-border',
        accent: 'bg-accent text-accent-fg border-accent',
        outline: 'bg-transparent text-fg border-border',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
