import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

export function Chip({ className, active = false, ...props }: ChipProps) {
  return (
    <span
      data-active={active}
      className={cn(
        'inline-flex items-center rounded-sm border px-2.5 py-1 text-xs',
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border bg-surface text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}
