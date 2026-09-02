import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-control w-full rounded-xl border border-border bg-bg px-3 text-body text-fg shadow-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      {...props}
    />
  );
}
