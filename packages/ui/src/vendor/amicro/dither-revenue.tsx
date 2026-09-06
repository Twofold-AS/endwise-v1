'use client';

import { useEffect, useMemo, useRef } from 'react';
import { hash, smoothstep } from './dither-math.ts';
import { useCanvasSetup } from './use-canvas-setup.ts';

export type DitherRevenueSeries = {
  key: string;
  label: string;
  color: string;
  data: number[];
  fill?: boolean;
};

export type RevenueLineChartProps = {
  theme?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  series: DitherRevenueSeries[];
};

/** Amicro Revenue Spline Line — stroke + dither fill under the curve. */
export function RevenueLineChart({
  compact: _compact = true,
  className = '',
  series,
}: RevenueLineChartProps) {
  const { canvasRef, rect, isVisible, reducedMotion } = useCanvasSetup();
  const primary = series[0];
  const points = primary?.data.length ?? 0;

  const maxVal = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    return Math.max(1, ...all) * 1.2;
  }, [series]);

  const targetDataRef = useRef(series.map((s) => [...s.data]));
  const fromDataRef = useRef(series.map((s) => [...s.data]));
  const morphStartTimeRef = useRef(0);

  useEffect(() => {
    fromDataRef.current = targetDataRef.current.map((row) => [...row]);
    targetDataRef.current = series.map((s) => [...s.data]);
    morphStartTimeRef.current = performance.now();
  }, [series]);

  useEffect(() => {
    let req = 0;
    let time = 0;
    const draw = () => {
      if (!isVisible.current) {
        req = requestAnimationFrame(draw);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: w, height: h } = rect.current;
      if (w === 0 || h === 0 || points < 2) {
        req = requestAnimationFrame(draw);
        return;
      }

      time += reducedMotion ? 0 : 0.02;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const prog = reducedMotion
        ? 1
        : Math.min(1, (performance.now() - morphStartTimeRef.current) / 500);
      const e = 1 - 2 ** (-10 * prog);
      const stepX = w / (points - 1);
      const cell = Math.max(2, Math.round(w / 200));

      series.forEach((s, sIdx) => {
        const target = targetDataRef.current[sIdx] ?? s.data;
        const from = fromDataRef.current[sIdx] ?? s.data;
        const fill = s.fill ?? sIdx === 0;

        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const val = (from[i] ?? 0) + ((target[i] ?? 0) - (from[i] ?? 0)) * e;
          const x = i * stepX;
          const y = h - (val / maxVal) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = sIdx === 0 ? 2.5 : 1.75;
        ctx.strokeStyle = s.color;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        if (!fill) return;

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = s.color;
        for (let x = 0; x <= w; x += cell) {
          for (let y = 0; y <= h; y += cell) {
            const jx = x + cell / 2;
            const jy = y + cell / 2;
            const jit = hash(jx, jy);
            const gradientFalloff = Math.max(0, 1 - jy / h);
            const waveRaw = reducedMotion
              ? 0
              : Math.sin(jx * 0.05 + time) + Math.sin(jy * 0.05 + time * 0.7);
            const mod = smoothstep(-1.5, 1.5, waveRaw);
            const sz = cell * (0.3 * gradientFalloff + 0.3 * mod) * (0.8 + 0.4 * jit);
            if (sz > 0) {
              ctx.fillRect(x + (cell - sz) / 2, y + (cell - sz) / 2, sz, sz);
            }
          }
        }
        ctx.restore();
      });

      ctx.restore();
      req = requestAnimationFrame(draw);
    };
    req = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(req);
  }, [canvasRef, isVisible, maxVal, points, rect, reducedMotion, series]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
