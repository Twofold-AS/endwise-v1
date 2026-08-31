'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { defaultCycle } from '../vendor/bloub/cycles.ts';
import { NOTIF_BLUE } from '../vendor/bloub/decor.ts';
import { BotEngine, type BotFrame } from '../vendor/bloub/engine.ts';
import {
  DEFAULT_EXPRESSION,
  EXPRESSION_BY_ID,
  type ExpressionId,
} from '../vendor/bloub/expressions.ts';
import { lookTarget, TURN_TIME } from '../vendor/bloub/gaze.ts';
import { clamp, easings } from '../vendor/bloub/math.ts';
import { DEMI_VIEWBOX, RAYON } from '../vendor/bloub/repere.ts';
import { DEFAULT_SHAPE, mixHex, SHAPE_BY_ID, type ShapeId } from '../vendor/bloub/skins.ts';
import { STATE_BY_ID, type StateId } from '../vendor/bloub/states.ts';

const ENDWISE_KROPP = '#111111';
const ENDWISE_PAPIR = '#ffffff';

export type BloubBotProps = {
  size?: number;
  state?: StateId;
  playing?: boolean;
  follow?: boolean;
  shape?: ShapeId;
  /** Kroppsfarge som hex. Default Endwise-aksent `#111111`. */
  color?: string;
  /** Sidebakgrunn som hex — øynene er maskehull mot denne. */
  paper?: string;
  expression?: ExpressionId;
  onStateChange?: (id: StateId) => void;
};

function radiiFor(shape: ShapeId) {
  return SHAPE_BY_ID.get(shape)?.radii ?? null;
}

function exprFor(id: ExpressionId) {
  return EXPRESSION_BY_ID.get(id) ?? null;
}

function Dot({ dot, paper, ink }: { dot: BotFrame['dots'][number]; paper: string; ink: string }) {
  const fill = dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth));
  if (dot.d) {
    return (
      <path
        d={dot.d}
        transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RAYON})`}
        fill={fill}
        opacity={dot.opacity}
      />
    );
  }
  return <circle cx={dot.x} cy={dot.y} r={dot.r} fill={fill} opacity={dot.opacity} />;
}

/**
 * React-port av bloub `BloubBot.vue`-rendringen.
 * Motoren remountes ikke: `setState` / `setExpression` / `setShape` går på
 * samme `BotEngine`. Klokken løper også når montasjen er stoppet (blink + derive).
 */
export function BloubBot({
  size = 320,
  state = 'idle',
  playing = false,
  follow = true,
  shape = DEFAULT_SHAPE,
  color = ENDWISE_KROPP,
  paper = ENDWISE_PAPIR,
  expression = DEFAULT_EXPRESSION,
  onStateChange,
}: BloubBotProps) {
  const reactId = useId().replace(/:/g, '');
  const maskId = `bot-mask-${reactId}`;
  const uid = `bot-${reactId}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const live = useRef({
    state,
    playing,
    follow,
    shape,
    expression,
  });
  live.current = { state, playing, follow, shape, expression };

  const engineRef = useRef<BotEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new BotEngine(RAYON, state, radiiFor(shape), exprFor(expression));
  }
  const engine = engineRef.current;

  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(0));

  const clockRef = useRef(0);
  const lastMsRef = useRef(0);
  const nextAtRef = useRef(Number.POSITIVE_INFINITY);
  const blockRef = useRef(0);
  const blockStartRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const aimingRef = useRef(false);
  const turnSinceRef = useRef(0);
  const cycleRef = useRef(defaultCycle().blocks);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointerRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const release = (now: number) => {
      if (!aimingRef.current) return;
      engine.setLook(null, now, TURN_TIME);
      aimingRef.current = false;
    };

    const aim = (now: number, current: StateId) => {
      if (!STATE_BY_ID.get(current)?.baseFace) {
        release(now);
        return;
      }
      const box = svgRef.current?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) return;
      if (!aimingRef.current) turnSinceRef.current = now;
      const pointer = pointerRef.current;
      const demiLargeur = Math.max(1, window.innerWidth / 2);
      const demiHauteur = Math.max(1, window.innerHeight / 2);
      engine.setLook(
        lookTarget({
          nx: pointer ? clamp((pointer.x - (box.left + box.width / 2)) / demiLargeur, -1, 1) : 0,
          ny: pointer ? clamp((pointer.y - (box.top + box.height / 2)) / demiHauteur, -1, 1) : 0,
          tour: easings.easeOutQuint(clamp((now - turnSinceRef.current) / TURN_TIME)),
          pointer: pointer !== null,
        }),
        now,
      );
      aimingRef.current = true;
    };

    const applyBlock = (i: number, from = 0) => {
      const blocks = cycleRef.current;
      const b = blocks[i];
      if (!b) {
        nextAtRef.current = Number.POSITIVE_INFINITY;
        return;
      }
      const clock = clockRef.current;
      blockRef.current = i;
      blockStartRef.current = clock - from;
      if (engine.state !== b.state) {
        engine.setState(b.state, clock);
        onStateChangeRef.current?.(b.state);
      }
      nextAtRef.current = clock - from + b.duration;
    };

    let raf = 0;
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      const last = lastMsRef.current;
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0;
      lastMsRef.current = ms;
      clockRef.current += dt;
      const clock = clockRef.current;
      const {
        state: want,
        playing,
        follow: followPtr,
        shape: wantShape,
        expression: wantExpr,
      } = live.current;

      engine.setShape(radiiFor(wantShape), clock);
      engine.setExpression(exprFor(wantExpr), clock);

      if (playing && !wasPlayingRef.current) {
        applyBlock(0);
      }
      if (!playing) {
        nextAtRef.current = Number.POSITIVE_INFINITY;
        if (engine.state !== want) {
          engine.setState(want, clock);
        }
      } else if (clock >= nextAtRef.current && cycleRef.current.length) {
        applyBlock((blockRef.current + 1) % cycleRef.current.length);
      }
      wasPlayingRef.current = playing;

      if (followPtr) aim(clock, engine.state);
      else release(clock);

      setFrame(engine.sample(clock));
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const R = DEMI_VIEWBOX;
  const ink = color;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
      role="img"
      aria-label="Bot"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-R} y={-R} width={R * 2} height={R * 2}>
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path
              key={`e${String(i)}`}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="#000"
            />
          ))}
          {frame.notch ? (
            <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />
          ) : null}
        </mask>
        {frame.arcs.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${uid}-${arc.id}`}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((c, i) => (
              <stop
                key={`${arc.id}-${String(i)}`}
                offset={i / (arc.grad.stops.length - 1)}
                stopColor={c}
              />
            ))}
          </linearGradient>
        ))}
      </defs>

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {frame.dotsBehind ? (
        <g>
          {frame.dots.map((dot, i) => (
            <Dot key={`pb${String(i)}`} dot={dot} paper={paper} ink={ink} />
          ))}
        </g>
      ) : null}

      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-R} y={-R} width={R * 2} height={R * 2} fill={ink} />
        </g>
      </g>

      {!frame.dotsBehind ? (
        <g>
          {frame.dots.map((dot, i) => (
            <Dot key={`pf${String(i)}`} dot={dot} paper={paper} ink={ink} />
          ))}
        </g>
      ) : null}

      {frame.notif ? (
        <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />
      ) : null}

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  );
}

export { DEFAULT_EXPRESSION, EXPRESSIONS, type ExpressionId } from '../vendor/bloub/expressions.ts';
export { DEFAULT_SHAPE, type ShapeId } from '../vendor/bloub/skins.ts';
export { SEQUENCE, type StateId } from '../vendor/bloub/states.ts';
