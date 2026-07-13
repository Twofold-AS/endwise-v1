import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';

const btn = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:opacity-90',
        secondary: 'bg-surface text-fg border border-border hover:bg-border/40',
        ghost: 'text-fg hover:bg-surface',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-sm',
        md: 'h-10 px-4 text-sm rounded-md',
        lg: 'h-12 px-6 text-base rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>;

export function Btn({ className, variant, size, ...props }: BtnProps) {
  return <button className={cn(btn({ variant, size }), className)} {...props} />;
}
