'use client';

import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { clamp, hash } from './dither-math.ts';
import { useCanvasSetup } from './use-canvas-setup.ts';

export type DitherStackedBand = { key: string; label: string; color: string };
export type DitherStackedRow = {
  label: string;
  [band: string]: string | number;
};

export type DitherStackedChartProps = {
  theme?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  rows: DitherStackedRow[];
  bands: DitherStackedBand[];
};

function getAxisMax(maxVal: number): number {
  if (maxVal === 0) return 100;
  const target = maxVal * 1.05;
  const power = 10 ** Math.floor(Math.log10(target));
  const normalized = target / power;
  let multiplier = 10;
  if (normalized <= 1) multiplier = 1;
  else if (normalized <= 2) multiplier = 2;
  else if (normalized <= 5) multiplier = 5;
  return multiplier * power;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTop: number,
  rBottom: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + rTop, y);
  ctx.lineTo(x + w - rTop, y);
  ctx.arcTo(x + w, y, x + w, y + rTop, rTop);
  ctx.lineTo(x + w, y + h - rBottom);
  ctx.arcTo(x + w, y + h, x + w - rBottom, y + h, rBottom);
  ctx.lineTo(x + rBottom, y + h);
  ctx.arcTo(x, y + h, x, y + h - rBottom, rBottom);
  ctx.lineTo(x, y + rTop);
  ctx.arcTo(x, y, x + rTop, y, rTop);
  ctx.closePath();
}

/** Amicro Dither Stacked Bar — canvas dither bands. */
export function DitherStackedChart({
  compact = true,
  className = '',
  rows,
  bands,
}: DitherStackedChartProps) {
  const [hoverBranch, setHoverBranch] = useState<number | null>(null);
  const [hoverBand, setHoverBand] = useState<number | null>(null);
  const { canvasRef, rect, isVisible, reducedMotion } = useCanvasSetup();

  const { data, axisMax } = useMemo(() => {
    const branches = rows.map((row) => {
      const segs = bands.map((band) => ({
        value: Math.max(0, Number(row[band.key] ?? 0)),
      }));
      const total = segs.reduce((s, b) => s + b.value, 0);
      return { total, bands: segs };
    });
    const maxBranch = Math.max(0, ...branches.map((b) => b.total));
    return { data: branches, axisMax: getAxisMax(maxBranch) };
  }, [rows, bands]);

  const timeRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  const drawnRef = useRef<Map<string, number>>(new Map());
  const morphStartTimeRef = useRef(0);
  const fromStateRef = useRef<Map<string, number>>(new Map());
  const hoverRef = useRef({ b: hoverBranch, band: hoverBand });

  useEffect(() => {
    hoverRef.current = { b: hoverBranch, band: hoverBand };
  }, [hoverBranch, hoverBand]);

  useEffect(() => {
    fromStateRef.current = new Map(drawnRef.current);
    morphStartTimeRef.current = performance.now();
  }, [data]);

  useEffect(() => {
    const draw = () => {
      if (!isVisible.current) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: w, height: h } = rect.current;
      if (w === 0 || h === 0) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += reducedMotion ? 0 : 0.02;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const n = rows.length;
      if (n === 0) {
        ctx.restore();
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      const colW = w / n;
      const barW = Math.min(colW * 0.62, 54);
      const cell = Math.max(3, Math.round(w / 200));
      const t2 = timeRef.current;

      let prog = 1;
      if (!reducedMotion && morphStartTimeRef.current > 0) {
        prog = Math.min(1, (performance.now() - morphStartTimeRef.current) / 620);
      }

      for (let i = 0; i < n; i++) {
        const bp =
          1 -
          (1 - clamp((prog - i * 0.05) / (1 - Math.max(0, n - 1) * 0.05), 0, 1)) ** 3;
        const colX = i * colW;
        const cx = colX + colW / 2;
        const x0 = cx - barW / 2;
        let currentY = h;

        for (let j = 0; j < bands.length; j++) {
          const key = `${i}-${j}`;
          const targetH = (data[i].bands[j].value / axisMax) * h;
          const fromH = fromStateRef.current.get(key) ?? 0;
          const segH = Math.max(0.1, fromH + (targetH - fromH) * bp);
          drawnRef.current.set(key, segH);

          const yTop = currentY - segH;
          const rTop = j === bands.length - 1 ? 8 : 5;
          const rBottom = j === 0 ? 7 : 5;
          const hb = hoverRef.current.b;
          const hband = hoverRef.current.band;
          const isHot = hb === i && hband === j;
          const isOtherBranch = hb !== null && hb !== i;
          const isOtherBand = hb === i && hband !== null && hband !== j;
          let alpha = 1;
          if (isOtherBranch) alpha = 0.3;
          else if (isOtherBand) alpha = 0.48;

          ctx.save();
          drawRoundedRect(ctx, x0, yTop, barW, segH, rTop, rBottom);
          ctx.clip();
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = bands[j].color;

          for (let bx = x0; bx < x0 + barW; bx += cell) {
            for (let by = yTop; by < currentY; by += cell) {
              const dx = bx - (x0 + barW / 2);
              const dy = by - (yTop + segH / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);
              const jitter = hash(bx, by);
              const wave = reducedMotion ? 0 : Math.sin(dist * 0.1 - t2 * 2) * 0.15;
              const sz = cell * (0.68 + wave + jitter * 0.2);
              ctx.fillRect(bx + (cell - sz) / 2, by + (cell - sz) / 2, sz, sz);
            }
          }
          ctx.restore();
          currentY = yTop;
        }
      }
      ctx.restore();
      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [axisMax, bands, canvasRef, data, isVisible, rect, reducedMotion, rows.length]);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const n = rows.length;
    if (n === 0) return;
    const colW = box.width / n;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(x / colW)));
    setHoverBranch(idx);
    const row = data[idx];
    const rel = 1 - y / box.height;
    let acc = 0;
    let bandIdx = 0;
    for (let j = 0; j < bands.length; j++) {
      acc += row.bands[j].value / axisMax;
      if (rel <= acc) {
        bandIdx = j;
        break;
      }
      bandIdx = j;
    }
    setHoverBand(bandIdx);
  };

  return (
    <div className={`relative flex h-full w-full flex-col ${className}`}>
      <div
        className="relative min-h-0 flex-1 touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => {
          setHoverBranch(null);
          setHoverBand(null);
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
      {compact ? null : (
        <div className="flex justify-between gap-1 pt-1 text-[11px] text-fg-muted">
          {rows.map((row) => (
            <span key={row.label} className="min-w-0 truncate text-center">
              {row.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
