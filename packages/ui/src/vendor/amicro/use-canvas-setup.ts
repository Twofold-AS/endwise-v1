'use client';

import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

export type CanvasRect = { width: number; height: number };

export type UseCanvasSetupResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  rect: RefObject<CanvasRect>;
  isVisible: RefObject<boolean>;
  reducedMotion: boolean;
};

/** Sett bitmap fra CSS-boks. Tegneloopen kaller dette hver frame. */
export function syncCanvasSize(
  canvas: HTMLCanvasElement,
  rect: RefObject<CanvasRect>,
): boolean {
  if (typeof window === 'undefined') return false;
  const box = canvas.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(box.width * dpr);
  const h = Math.round(box.height * dpr);
  rect.current = { width: box.width, height: box.height };
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.dataset.amicroReady = '1';
  return true;
}

/**
 * Amicro canvas hook: plain object-ref + ResizeObserver / IntersectionObserver.
 * Tegneloopen synker også størrelse selv (`syncCanvasSize`) — hjem-kortene
 * ble stående på default 300×150 når setup-effect traff tom node.
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

  useLayoutEffect(() => {
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let raf = 0;
    let tries = 0;

    const attach = (node: HTMLCanvasElement) => {
      syncCanvasSize(node, rect);
      ro = new ResizeObserver(() => {
        syncCanvasSize(node, rect);
      });
      ro.observe(node);
      io = new IntersectionObserver(
        ([entry]) => {
          isVisible.current = entry.isIntersecting || entry.intersectionRatio > 0;
        },
        { rootMargin: '100px', threshold: [0, 0.01, 0.1, 0.5, 1] },
      );
      io.observe(node);
    };

    const wait = () => {
      const node = canvasRef.current;
      if (node) {
        attach(node);
        return;
      }
      if (tries++ < 60) raf = requestAnimationFrame(wait);
    };
    wait();

    const handleVisibility = () => {
      isVisible.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { canvasRef, rect, isVisible, reducedMotion };
}
