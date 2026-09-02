'use client';

import { useMemo } from 'react';

/**
 * Lokal kopi av React Bits Gradual Blur (MIT) — samme API som
 * https://reactbits.dev/animations/gradual-blur
 * uten `mathjs` (ikke i techstack). Kun backdrop-blur + maske,
 * ingen hvit/svart plate.
 */

type Position = 'top' | 'bottom' | 'left' | 'right';
type Curve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';

export type GradualBlurProps = {
  target?: 'parent' | 'page';
  position?: Position;
  height?: string;
  width?: string;
  strength?: number;
  divCount?: number;
  curve?: Curve;
  exponential?: boolean;
  zIndex?: number;
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
};

const KURVER: Record<Curve, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - (1 - p) * (1 - p),
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
};

function retning(position: Position): string {
  if (position === 'top') return 'to top';
  if (position === 'left') return 'to left';
  if (position === 'right') return 'to right';
  return 'to bottom';
}

export function GradualBlur({
  target = 'parent',
  position = 'bottom',
  height = '6rem',
  width,
  strength = 2,
  divCount = 5,
  curve = 'bezier',
  exponential = false,
  zIndex = 40,
  opacity = 1,
  className = '',
  style,
}: GradualBlurProps) {
  const lag = useMemo(() => {
    const steg = 100 / divCount;
    const kurve = KURVER[curve] ?? KURVER.linear;
    const dir = retning(position);
    const noder: React.ReactNode[] = [];
    for (let i = 1; i <= divCount; i++) {
      const progress = kurve(i / divCount);
      const blur = exponential
        ? 2 ** (progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * divCount + 1) * strength;
      const p1 = Math.round((steg * i - steg) * 10) / 10;
      const p2 = Math.round(steg * i * 10) / 10;
      const p3 = Math.round((steg * i + steg) * 10) / 10;
      const p4 = Math.round((steg * i + steg * 2) * 10) / 10;
      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;
      noder.push(
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            maskImage: `linear-gradient(${dir}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${dir}, ${gradient})`,
            backdropFilter: `blur(${blur.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
            opacity,
          }}
        />,
      );
    }
    return noder;
  }, [curve, divCount, exponential, opacity, position, strength]);

  const vertikal = position === 'top' || position === 'bottom';
  const page = target === 'page';

  return (
    <div
      data-gradual-blur
      data-gradual-blur-pos={position}
      className={className}
      style={{
        position: page ? 'fixed' : 'absolute',
        pointerEvents: 'none',
        zIndex: page ? zIndex + 100 : zIndex,
        ...(vertikal
          ? { height, width: width ?? '100%', left: 0, right: 0, [position]: 0 }
          : { width: width ?? height, height: '100%', top: 0, bottom: 0, [position]: 0 }),
        ...style,
      }}
    >
      <div className="pointer-events-none absolute inset-0">{lag}</div>
    </div>
  );
}
