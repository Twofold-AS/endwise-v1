import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.ts';
import { FELT_MD } from '../lib/felt.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(FELT_MD, className)} {...props} />;
}
