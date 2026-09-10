'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { hash, hexToRgba, smoothstep } from './dither-math.ts';
import { syncCanvasSize, useCanvasSetup } from './use-canvas-setup.ts';

export type DitherDonutSlice = { name: string; value: number; color: string };

export type DitherDonutChartProps = {
  theme?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  slices: DitherDonutSlice[];
  /** Canvas-radianer. Default −π/2 = kl. 12. π = venstre, klokkevis mot høyre. */
  startAngle?: number;
  /** Buelengde i radianer. Default 2π (hel ring). π = halvsirkel. */
  sweep?: number;
};

function drawRoundedWedge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  aStart: number,
  aEnd: number,
  cr: number,
) {
  const sweep = aEnd - aStart;
  const maxCr = Math.min(cr, (rOut - rIn) / 2, (sweep * rIn) / 2);
  if (sweep <= 0.001) return;
  const aStartIn = aStart + maxCr / rIn;
  const aEndIn = aEnd - maxCr / rIn;
  const aStartOut = aStart + maxCr / rOut;
  const aEndOut = aEnd - maxCr / rOut;
  ctx.moveTo(cx + rIn * Math.cos(aStartIn), cy + rIn * Math.sin(aStartIn));
  ctx.arc(cx, cy, rIn, aStartIn, aEndIn);
  ctx.arcTo(
    cx + rIn * Math.cos(aEnd),
    cy + rIn * Math.sin(aEnd),
    cx + rOut * Math.cos(aEnd),
    cy + rOut * Math.sin(aEnd),
    maxCr,
  );
  ctx.arcTo(
    cx + rOut * Math.cos(aEnd),
    cy + rOut * Math.sin(aEnd),
    cx + rOut * Math.cos(aEndOut),
    cy + rOut * Math.sin(aEndOut),
    maxCr,
  );
  ctx.arc(cx, cy, rOut, aEndOut, aStartOut, true);
  ctx.arcTo(
    cx + rOut * Math.cos(aStart),
    cy + rOut * Math.sin(aStart),
    cx + rIn * Math.cos(aStart),
    cy + rIn * Math.sin(aStart),
    maxCr,
  );
  ctx.arcTo(
    cx + rIn * Math.cos(aStart),
    cy + rIn * Math.sin(aStart),
    cx + rIn * Math.cos(aStartIn),
    cy + rIn * Math.sin(aStartIn),
    maxCr,
  );
}

/** Amicro Dither Donut — rounded wedges filled with dither tiles. */
export function DitherDonutChart({
  compact: _compact = true,
  className = '',
  slices,
  startAngle = -Math.PI / 2,
  sweep = Math.PI * 2,
}: DitherDonutChartProps) {
  const startAngleProp = startAngle;
  const sweepProp = sweep > 0 ? sweep : Math.PI * 2;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { canvasRef, rect, isVisible, reducedMotion } = useCanvasSetup();

  const { shares } = useMemo(() => {
    const total = slices.reduce((s, sl) => s + sl.value, 0);
    const safe = total > 0 ? total : 1;
    return { shares: slices.map((sl) => sl.value / safe) };
  }, [slices]);

  const timeRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  const morphStartTimeRef = useRef(0);
  const fromSharesRef = useRef<number[]>([]);
  const targetSharesRef = useRef<number[]>([]);
  const dispSharesRef = useRef<number[]>([]);
  const hoverRef = useRef(hoverIndex);

  useEffect(() => {
    hoverRef.current = hoverIndex;
  }, [hoverIndex]);

  useEffect(() => {
    if (dispSharesRef.current.length === 0) {
      dispSharesRef.current = [...shares];
      fromSharesRef.current = [...shares];
      targetSharesRef.current = [...shares];
    } else {
      fromSharesRef.current = [...dispSharesRef.current];
      targetSharesRef.current = [...shares];
      morphStartTimeRef.current = performance.now();
    }
  }, [shares]);

  useEffect(() => {
    const draw = () => {
      if (!isVisible.current) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
      syncCanvasSize(canvas, rect);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
      const { width: logW, height: logH } = rect.current;
      if (logW === 0 || logH === 0) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += reducedMotion ? 0 : 0.02;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const logicalSize = 200;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale((logW * dpr) / logicalSize, (logH * dpr) / logicalSize);

      let t = 1;
      if (!reducedMotion && morphStartTimeRef.current > 0) {
        t = Math.min(1, (performance.now() - morphStartTimeRef.current) / 500);
      }
      const e = 1 - 2 ** (-10 * t);
      for (let i = 0; i < targetSharesRef.current.length; i++) {
        dispSharesRef.current[i] =
          (fromSharesRef.current[i] ?? 0) +
          ((targetSharesRef.current[i] ?? 0) - (fromSharesRef.current[i] ?? 0)) * e;
      }

      let startAngle = startAngleProp;
      const gap = 0.07;
      const currentHover = hoverRef.current;
      const t2 = timeRef.current;

      for (let i = 0; i < dispSharesRef.current.length; i++) {
        const share = dispSharesRef.current[i] ?? 0;
        if (share === 0) continue;
        const sliceSweep = share * sweepProp;
        const aStart = startAngle + gap / 2;
        let aEnd = startAngle + sliceSweep - gap / 2;
        if (aEnd < aStart) aEnd = aStart;
        const sliceColor = slices[i]?.color ?? '#8f99a8';

        ctx.save();
        const isHovered = currentHover === i;
        const isAnyHovered = currentHover !== null;
        if (isHovered) {
          const mid = (aStart + aEnd) / 2;
          ctx.translate(Math.cos(mid) * 6, Math.sin(mid) * 6);
        }
        ctx.beginPath();
        drawRoundedWedge(ctx, 100, 100, 55, 86, aStart, aEnd, 6);
        ctx.clip();
        ctx.globalAlpha = isHovered ? 1 : isAnyHovered ? 0.3 * 0.72 : 0.72;
        ctx.fillStyle = sliceColor;
        if (isHovered) {
          ctx.shadowColor = hexToRgba(sliceColor, 0.55);
          ctx.shadowBlur = 5;
        }

        const cell = 4.6;
        for (let x = 14; x <= 186; x += cell) {
          for (let y = 14; y <= 186; y += cell) {
            const dx = x - 100;
            const dy = y - 100;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 55 - cell || dist > 86 + cell) continue;
            let a = Math.atan2(dy, dx);
            let normalizedA = a - aStart;
            while (normalizedA < 0) normalizedA += Math.PI * 2;
            while (normalizedA >= Math.PI * 2) normalizedA -= Math.PI * 2;
            if (normalizedA > aEnd - aStart) continue;
            const fullness = smoothstep(0.62, 1, (dist - 55) / (86 - 55));
            const waveRaw = reducedMotion
              ? 0
              : Math.sin(dist * 0.1 - t2) +
                Math.sin(a * 3 + t2 * 1.5) +
                Math.sin(dx * 0.05 + dy * 0.05 + t2 * 2);
            const wave = smoothstep(-1.5, 1.5, waveRaw);
            const jitter = hash(x, y);
            const size =
              cell *
              ((isHovered ? 0.46 : 0.34) + 0.36 * fullness + 0.26 * wave) *
              (0.78 + 0.42 * jitter);
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          }
        }
        ctx.restore();
        startAngle += sliceSweep;
      }
      ctx.restore();
      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [canvasRef, isVisible, rect, reducedMotion, slices, startAngleProp, sweepProp]);

  return (
    <div
      className={`relative h-full w-full ${className}`}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - box.left - box.width / 2;
          const y = event.clientY - box.top - box.height / 2;
          const dist = Math.sqrt(x * x + y * y);
          const r = Math.min(box.width, box.height) / 2;
          if (dist < r * 0.35 || dist > r * 0.95) {
            setHoverIndex(null);
            return;
          }
          let angle = Math.atan2(y, x) - startAngleProp;
          if (angle < 0) angle += Math.PI * 2;
          let acc = 0;
          let found = null as number | null;
          for (let i = 0; i < shares.length; i++) {
            acc += (shares[i] ?? 0) * sweepProp;
            if (angle <= acc) {
              found = i;
              break;
            }
          }
          setHoverIndex(found);
        }}
      />
    </div>
  );
}
