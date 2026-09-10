'use client';

import { type RefObject, useMemo, useRef, useState } from 'react';

export type CanvasRect = { width: number; height: number };

export type AmicroCanvasRef = ((node: HTMLCanvasElement | null) => void) & {
  current: HTMLCanvasElement | null;
};

export type UseCanvasSetupResult = {
  canvasRef: AmicroCanvasRef;
  rect: RefObject<CanvasRect>;
  isVisible: RefObject<boolean>;
  reducedMotion: boolean;
};

/**
 * Amicro canvas hook: ResizeObserver for size, IntersectionObserver to pause
 * off-screen, visibilitychange for hidden tabs, prefers-reduced-motion once.
 *
 * `canvasRef` is both a callback ref (noden bindes når canvas mountes)
 * og `{ current }` til rAF-tegneloopen. Objekt-ref + useEffect traff tom
 * node på hjem-kortene — bitmap ble værende 300×150 og dither tegnet aldri.
 */
export function useCanvasSetup(): UseCanvasSetupResult {
  const rect = useRef<CanvasRect>({ width: 0, height: 0 });
  const isVisible = useRef(true);
  const stopRef = useRef<(() => void) | undefined>(undefined);

  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.innerWidth < 768 ||
      window.matchMedia('(max-width: 768px)').matches
    );
  });

  const canvasRef = useMemo<AmicroCanvasRef>(() => {
    const bind = ((node: HTMLCanvasElement | null) => {
      stopRef.current?.();
      stopRef.current = undefined;
      bind.current = node;
      if (!node || typeof window === 'undefined') return;

      const applySize = (width: number, height: number) => {
        if (width <= 0 || height <= 0) return false;
        rect.current = { width, height };
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        node.width = Math.round(width * dpr);
        node.height = Math.round(height * dpr);
        node.dataset.amicroReady = '1';
        return true;
      };

      const measure = () => {
        const box = node.getBoundingClientRect();
        return applySize(box.width, box.height);
      };

      measure();
      let raf = 0;
      if (rect.current.width === 0 || rect.current.height === 0) {
        raf = requestAnimationFrame(() => {
          if (!measure()) {
            raf = requestAnimationFrame(() => {
              measure();
            });
          }
        });
      }

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (!applySize(width, height)) measure();
        }
      });
      ro.observe(node);

      const io = new IntersectionObserver(
        ([entry]) => {
          isVisible.current = entry.isIntersecting || entry.intersectionRatio > 0;
        },
        { rootMargin: '100px', threshold: [0, 0.01, 0.1, 0.5, 1] },
      );
      io.observe(node);

      const handleVisibility = () => {
        isVisible.current = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', handleVisibility);

      stopRef.current = () => {
        if (raf) cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }) as AmicroCanvasRef;
    bind.current = null;
    return bind;
  }, []);

  return { canvasRef, rect, isVisible, reducedMotion };
}
