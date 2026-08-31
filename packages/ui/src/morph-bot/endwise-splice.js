/**
 * Spleiser Endwise-blob inn i Morph Bot-runtime på /bot.
 * Muterer de delte original-data-eksportene FØR motoren konstrueres, slik at
 * <morph-bot> aldri leser Grok-øyne eller 18-formsvelgeren på denne flaten.
 * Runtime (fjær, blink Y-skala, peker, Morph-oneshots) er urørt.
 */

import MorphBotElement from '../vendor/morph-bot/morph-bot.js';
import { EXPRESSIONS, ORIGINAL_STATE_DATA, SHAPES } from '../vendor/morph-bot/original-data.js';
import { ENDWISE_BLOB, ENDWISE_SHAPE_ID } from './endwise-blob.js';

const HEAD_C = ENDWISE_BLOB.canvas.headC;

/** Nærmeste av de seks Endwise-øyene per motor-tilstand. */
export const ENDWISE_OYE_FOR_TILSTAND = Object.freeze({
  idle: 'idle',
  sleeping: 'idle',
  waking: 'idle',
  humming: 'idle',
  bored: 'idle',
  shy: 'idle',
  drowsy: 'idle',
  'powering-down': 'idle',
  thinking: 'tenker',
  working: 'tenker',
  searching: 'tenker',
  writing: 'tenker',
  dictating: 'tenker',
  listening: 'lytter',
  curious: 'lytter',
  loading: 'laster',
  spawning: 'laster',
  progress: 'laster',
  orbit: 'laster',
  radar: 'laster',
  uploading: 'laster',
  sending: 'laster',
  receiving: 'laster',
  celebrate: 'feirer',
  happy: 'feirer',
  proud: 'feirer',
  excited: 'feirer',
  playful: 'feirer',
  laughing: 'feirer',
  alerting: 'alarm',
  surprised: 'alarm',
  scared: 'alarm',
  angry: 'alarm',
  suspicious: 'alarm',
  confused: 'alarm',
  sad: 'alarm',
  notifying: 'alarm',
  dragging: 'alarm',
  bouncing: 'alarm',
});

/**
 * Motoren har 25 EXPRESSIONS-plasser og hardkoder indeks 0, 3 og 13.
 * 0 og 3 og 13 = idle (waking/sleeping). Øvrige seks får egne indekser.
 */
export const ENDWISE_OYE_INDEKS = Object.freeze({
  idle: 0,
  tenker: 1,
  lytter: 2,
  laster: 6,
  feirer: 4,
  alarm: 5,
});

function spanAt(ring, y) {
  let left = Number.NEGATIVE_INFINITY;
  let right = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i += 1) {
    const start = ring[i];
    const end = ring[(i + 1) % ring.length];
    if (start[1] <= y === end[1] <= y) continue;
    const x = start[0] + ((end[0] - start[0]) * (y - start[1])) / (end[1] - start[1]);
    if (x <= HEAD_C) left = Math.max(left, x);
    else right = Math.min(right, x);
  }
  return [Number.isFinite(left) ? left : HEAD_C, Number.isFinite(right) ? right : HEAD_C];
}

/** Roter ringen så indeks 0 er høyre ytterpunkt — samme konvensjon som CIRCLE_RING. */
function rotateRingToRightmost(ring) {
  let best = 0;
  for (let i = 1; i < ring.length; i += 1) {
    if (ring[i][0] > ring[best][0]) best = i;
  }
  return [...ring.slice(best), ...ring.slice(0, best)];
}

function buildEndwiseShape() {
  const ring = rotateRingToRightmost(ENDWISE_BLOB.body96.map(([x, y]) => [x, y]));
  const ys = ring.map((p) => p[1]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  let radius = 0;
  for (const [x, y] of ring) {
    radius = Math.max(radius, Math.hypot(x - HEAD_C, y - HEAD_C));
  }
  const equator = spanAt(ring, HEAD_C);
  const beltRadius = Math.max((equator[1] - equator[0]) / 2, radius * 0.98);
  const spanSamples = Array.from({ length: 160 }, (_, i) => {
    const y = top + (bottom - top) * ((i + 0.5) / 160);
    return spanAt(ring, y);
  });
  return {
    label: 'Endwise',
    path: ENDWISE_BLOB.bodyPath,
    radius,
    beltRadius,
    tiltScale: 1,
    face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1 },
    ring,
    sides: 0,
    solid: null,
    top,
    bottom,
    spanSamples,
  };
}

function eyePair(navn) {
  const set = ENDWISE_BLOB.eyes48[navn];
  return [set.L.map(([x, y]) => [x, y]), set.R.map(([x, y]) => [x, y])];
}

function padExpressions() {
  const byName = {
    idle: eyePair('idle'),
    tenker: eyePair('tenker'),
    lytter: eyePair('lytter'),
    laster: eyePair('laster'),
    feirer: eyePair('feirer'),
    alarm: eyePair('alarm'),
  };
  /** 25 plasser. Hardkodede 0/3/13 = idle. Øvrige peker på nærmeste Endwise-sett. */
  const slots = [
    'idle',
    'tenker',
    'lytter',
    'idle',
    'feirer',
    'alarm',
    'laster',
    'laster',
    'idle',
    'tenker',
    'lytter',
    'feirer',
    'alarm',
    'idle',
    'idle',
    'tenker',
    'lytter',
    'laster',
    'feirer',
    'alarm',
    'idle',
    'tenker',
    'lytter',
    'laster',
    'feirer',
  ];
  for (let i = 0; i < EXPRESSIONS.length; i += 1) {
    const pair = byName[slots[i] ?? 'idle'];
    EXPRESSIONS[i][0] = pair[0];
    EXPRESSIONS[i][1] = pair[1];
  }
}

function replacePools() {
  const pools = ORIGINAL_STATE_DATA.EXPRESSION_POOLS;
  for (const [state, oye] of Object.entries(ENDWISE_OYE_FOR_TILSTAND)) {
    const index = ENDWISE_OYE_INDEKS[oye];
    pools[state] = [index];
  }
}

const endwiseShape = buildEndwiseShape();
for (const id of Object.keys(SHAPES)) {
  SHAPES[id] = endwiseShape;
}
SHAPES[ENDWISE_SHAPE_ID] = endwiseShape;
padExpressions();
replacePools();

Object.defineProperty(MorphBotElement.prototype, 'shape', {
  get() {
    return ENDWISE_SHAPE_ID;
  },
  set() {
    this.setAttribute('shape', ENDWISE_SHAPE_ID);
  },
  configurable: true,
});

MorphBotElement.prototype.setShape = function setShapeEndwise() {
  this.setAttribute('shape', ENDWISE_SHAPE_ID);
  return this;
};

export { ENDWISE_BLOB, ENDWISE_SHAPE_ID, MorphBotElement };
