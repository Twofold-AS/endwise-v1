'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Tooltip, TooltipTrigger } from '../components/base/tooltip/tooltip.tsx';
import { Button } from '../components/button.tsx';
import { cn } from '../lib/utils.ts';

/**
 * Handling uten backend: vises, men er deaktivert.
 * Kort nøytral norsk forklaring i tooltip — aldri «ingen API».
 * Knappen er fokuserbar (aria-disabled) så tooltip virker med tastatur.
 */
export function DeaktivertHandling({
  forklaring,
  children,
  className,
  variant = 'ghost',
  size = 'default',
}: {
  forklaring: string;
  children: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
}) {
  return (
    <TooltipTrigger delay={200}>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-disabled="true"
        title={forklaring}
        data-deaktivert-handling
        className={cn('opacity-50', className)}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </Button>
      <Tooltip size="sm" showArrow={false}>
        {forklaring}
      </Tooltip>
    </TooltipTrigger>
  );
}
