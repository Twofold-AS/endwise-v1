'use client';

import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

export type CanvasRect = { width: number; height: number };

export type UseCanvasSetupResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  rect: RefObject<CanvasRect>;
  isVisible: RefObject<boolean>;
  reducedMotion: boolean;
};

function applyCanvasSize(canvas: HTMLCanvasElement, rect: CanvasRect, width: number, height: number) {
  if (width <= 0 || height <= 0) return;
  rect.width = width;
  rect.height = height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

/**
 * Amicro canvas hook: ResizeObserver for size, IntersectionObserver to pause
 * off-screen, visibilitychange for hidden tabs, prefers-reduced-motion once.
 * `initial` locks CSS-piksler før første paint — 72px-bobler kan ikke vente
 * på h-full + ResizeObserver (0-flate ⇒ IntersectionObserver = hidden).
 */
export function useCanvasSetup(initial?: CanvasRect): UseCanvasSetupResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rect = useRef<CanvasRect>({
    width: initial?.width ?? 0,
    height: initial?.height ?? 0,
  });
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (initial && initial.width > 0 && initial.height > 0) {
      applyCanvasSize(canvas, rect.current, initial.width, initial.height);
    } else {
      const box = canvas.getBoundingClientRect();
      applyCanvasSize(canvas, rect.current, box.width, box.height);
      const parent = canvas.parentElement;
      if (rect.current.width === 0 && parent) {
        applyCanvasSize(canvas, rect.current, parent.clientWidth, parent.clientHeight);
      }
    }

    const locked = Boolean(initial && initial.width > 0 && initial.height > 0);
    const ro = new ResizeObserver((entries) => {
      if (locked) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        applyCanvasSize(canvas, rect.current, width, height);
      }
    });
    if (!locked) {
      ro.observe(canvas.parentElement ?? canvas);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const { width, height } = entry.boundingClientRect;
        // 0-flate rapporteres ofte som «ikke synlig» — ikke slå av tegning da.
        if (width === 0 && height === 0) return;
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
  }, [initial?.height, initial?.width]);

  return { canvasRef, rect, isVisible, reducedMotion };
}
