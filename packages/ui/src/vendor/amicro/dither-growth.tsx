'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clamp, smoothstep } from './dither-math.ts';
import { useCanvasSetup } from './use-canvas-setup.ts';

export function paintDitherGrowth(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    data: number[];
    color: string;
    dpr?: number;
    time?: number;
    reducedMotion?: boolean;
    pointer?: { x: number; y: number; active: boolean };
  },
) {
  const w = opts.width;
  const h = opts.height;
  const dpr = opts.dpr ?? 1;
  const data = opts.data.length > 0 ? opts.data : [0];
  const curMax = Math.max(1, ...data);
  const tiny = w < 100 || h < 100;
  const cell = Math.max(tiny ? 6 : 3, Math.round(w / 180));
  const t2 = opts.time ?? 0;
  const px = opts.pointer?.x ?? -100;
  const py = opts.pointer?.y ?? -100;
  const isActive = opts.pointer?.active ?? false;
  const reducedMotion = opts.reducedMotion ?? true;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.scale(dpr, dpr);

  for (let x = 0; x < w; x += cell) {
    const t = x / w;
    const exactIdx = t * (data.length - 1);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(i0 + 1, data.length - 1);
    const frac = exactIdx - i0;
    const val = (data[i0] ?? 0) + ((data[i1] ?? 0) - (data[i0] ?? 0)) * frac;
    const headroom = (tiny ? 0.08 : 0.16) * h;
    const plotH = h - headroom;
    const curveY = h - plotH * (val / curMax);

    for (let y = h; y >= 0; y -= cell) {
      if (!tiny) {
        ctx.fillStyle = 'rgba(28, 29, 31, 0.04)';
        ctx.fillRect(x + 1, y + 1, cell - 1, cell - 1);
      }
      if (y < curveY) continue;

      const dx = x - px;
      const dy = y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let glow = 0;
      if (isActive && !reducedMotion) {
        glow = 1 - smoothstep(0, h * 0.35, dist);
      }
      const shimmer = reducedMotion ? 0 : Math.sin(y * 0.1 - t2 * 2) * 0.07;
      ctx.fillStyle = opts.color;
      const sz = cell * ((tiny ? 0.92 : 0.7) + shimmer + glow * 0.3);
      ctx.globalAlpha = (tiny ? 1 : 0.6) + glow * 0.4;
      const offset = (cell - sz) / 2;
      ctx.fillRect(x + offset, y + offset, sz, sz);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

export type DitherGrowthChartProps = {
  theme?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  values: number[];
  labels: string[];
  color?: string;
  valueSuffix?: string;
  /** Låst CSS-størrelse i px — pulse-boble og andre mini-flater. */
  width?: number;
  height?: number;
};

/** Amicro Dither Area Growth — tiled dither under a growth curve. */
export function DitherGrowthChart({
  compact = true,
  className = '',
  values,
  labels,
  color = '#141414',
  valueSuffix = '',
  width,
  height,
}: DitherGrowthChartProps) {
  const locked =
    width != null && height != null && width > 0 && height > 0
      ? { width, height }
      : undefined;
  const { canvasRef, rect, isVisible, reducedMotion } = useCanvasSetup(locked);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const targetX = useSpring(0, { stiffness: 650, damping: 42, mass: 0.5 });
  const targetY = useSpring(0, { stiffness: 650, damping: 42, mass: 0.5 });

  const { data, maxVal } = useMemo(() => {
    const series = values.length > 0 ? values : [0];
    return { data: series, maxVal: Math.max(1, ...series) };
  }, [values]);

  const timeRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  const pointerPosRef = useRef({ x: -100, y: -100 });
  const pointerActiveRef = useRef(false);
  const fromDataRef = useRef([...data]);
  const fromMaxRef = useRef(maxVal);
  const targetDataRef = useRef([...data]);
  const targetMaxRef = useRef(maxVal);
  const morphStartTimeRef = useRef(0);

  useLayoutEffect(() => {
    if (!locked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(locked.width * dpr);
    canvas.height = Math.round(locked.height * dpr);
    paintDitherGrowth(ctx, {
      width: locked.width,
      height: locked.height,
      data,
      color,
      dpr,
      reducedMotion: true,
    });
  }, [canvasRef, color, data, locked?.height, locked?.width]);

  useEffect(() => {
    const old = targetDataRef.current;
    fromMaxRef.current = targetMaxRef.current;
    targetDataRef.current = [...data];
    targetMaxRef.current = maxVal;
    if (old.length !== data.length) {
      fromDataRef.current = data.map((_, i) => {
        const t = data.length > 1 ? i / (data.length - 1) : 0;
        const oldIdx = Math.round(t * Math.max(0, old.length - 1));
        return old[oldIdx] ?? 0;
      });
    } else {
      fromDataRef.current = [...old];
    }
    morphStartTimeRef.current = performance.now();
  }, [data, maxVal]);

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
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
      const { width: w, height: h } = rect.current;
      if (w === 0 || h === 0) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += reducedMotion ? 0 : 0.03;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      let prog = 1;
      if (!reducedMotion && morphStartTimeRef.current > 0) {
        prog = Math.min(1, (performance.now() - morphStartTimeRef.current) / 460);
      }
      const curData = targetDataRef.current.map(
        (v, i) => (fromDataRef.current[i] ?? 0) + (v - (fromDataRef.current[i] ?? 0)) * prog,
      );

      paintDitherGrowth(ctx, {
        width: w,
        height: h,
        data: curData.length > 0 ? curData : [0],
        color,
        dpr,
        time: timeRef.current,
        reducedMotion,
        pointer: {
          x: pointerPosRef.current.x,
          y: pointerPosRef.current.y,
          active: pointerActiveRef.current,
        },
      });
      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [canvasRef, color, isVisible, rect, reducedMotion]);

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const box = wrapper.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    pointerPosRef.current = { x, y };
    pointerActiveRef.current = true;
    const { width: w, height: h } = rect.current;
    if (w === 0 || data.length === 0) return;
    const t = clamp(x / w, 0, 1);
    const idx = Math.round(t * (data.length - 1));
    setScrubIndex(idx);
    const actualT = data.length > 1 ? idx / (data.length - 1) : 0.5;
    targetX.set(actualT * w);
    const val = data[idx] ?? 0;
    const headroom = 0.16 * h;
    const plotH = h - headroom;
    targetY.set(h - plotH * (val / maxVal));
  };

  const xPos = useTransform(targetX, (x) => `${x}px`);
  const yPos = useTransform(targetY, (y) => `${y}px`);

  const boxStyle =
    locked != null
      ? { width: locked.width, height: locked.height }
      : { width: '100%' as const, height: '100%' as const };

  return (
    <div
      ref={wrapperRef}
      className={`relative touch-none ${locked ? 'shrink-0' : 'h-full w-full'} ${className}`}
      style={boxStyle}
      onPointerMove={handlePointer}
      onPointerLeave={() => {
        pointerActiveRef.current = false;
        setScrubIndex(null);
      }}
    >
      <canvas ref={canvasRef} className="block" style={boxStyle} />
      {scrubIndex !== null && (
        <>
          <motion.div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-[#141414]/80"
            style={{ left: xPos }}
          />
          <motion.div
            className="pointer-events-none absolute z-20 h-3 w-3 -mt-1.5 -ml-1.5 rounded-full border-2 border-white bg-[#141414]"
            style={{ left: xPos, top: yPos }}
          />
          {!compact && (
            <motion.div
              className="pointer-events-none absolute z-30 mb-3 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-fg shadow-sm"
              style={{ left: xPos, top: yPos }}
            >
              {labels[scrubIndex] ?? ''} {data[scrubIndex]}
              {valueSuffix}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
