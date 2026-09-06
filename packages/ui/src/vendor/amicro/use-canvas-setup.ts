'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

export type CanvasRect = { width: number; height: number };

export type UseCanvasSetupResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  rect: RefObject<CanvasRect>;
  isVisible: RefObject<boolean>;
  reducedMotion: boolean;
};

/**
 * Amicro canvas hook: ResizeObserver for size, IntersectionObserver to pause
 * off-screen, visibilitychange for hidden tabs, prefers-reduced-motion once.
 */
export function useCanvasSetup(): UseCanvasSetupResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rect = useRef<CanvasRect>({ width: 0, height: 0 });
  const isVisible = useRef(true);

  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.innerWidth < 768 ||
      window.matchMedia('(max-width: 768px)').matches
    );
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        rect.current = { width, height };
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
      },
      { rootMargin: '100px' },
    );
    io.observe(canvas);

    const handleVisibility = () => {
      isVisible.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { canvasRef, rect, isVisible, reducedMotion };
}
