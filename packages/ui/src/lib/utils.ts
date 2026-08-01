import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui-konvensjonen: `cn()` bor her. Registry-pakker (shadcn, beUI) importerer denne. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
