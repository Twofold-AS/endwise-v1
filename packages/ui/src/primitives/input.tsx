import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-control w-full rounded-sm border-0 bg-inset px-3 text-body text-fg shadow-none placeholder:text-fg-faint focus-visible:outline-2 focus-visible:outline-fg',
        className,
      )}
      {...props}
    />
  );
}
