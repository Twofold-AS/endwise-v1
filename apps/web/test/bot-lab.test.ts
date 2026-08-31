import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PHONE_HJEM, PHONE_KORT_META } from '../app/(app)/_shell/phone-home.ts';
import { BOT_HOVED, BOT_MORPHS, BOT_TILSTANDER } from '../app/(app)/bot/_katalog.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Bot-lab — Endwise-blob', () => {
  it('har 39 tilstander, 14 Morphs og seks primærchips', () => {
    expect(BOT_TILSTANDER).toHaveLength(39);
    expect(BOT_MORPHS).toHaveLength(14);
    expect(BOT_HOVED.map((h) => h.label)).toEqual([
      'idle',
      'tenker',
      'lytter',
      'laster',
      'feirer',
      'alarm',
    ]);
    expect(BOT_HOVED.map((h) => h.tilstand)).toEqual([
      'idle',
      'thinking',
      'listening',
      'loading',
      'celebrate',
      'alerting',
    ]);
  });

  it('sidebar har Bot etter Hjelp, ikke på telefon-hjem', () => {
    const labels = FORHANDLER_NAV.map((i) => i.label);
    expect(labels.at(-2)).toBe('Hjelp');
    expect(labels.at(-1)).toBe('Bot');
    const bot = FORHANDLER_NAV.find((i) => i.key === 'bot');
    expect(bot?.href).toBe('/bot');
    expect(bot?.label).toBe('Bot');
    expect(breadcrumbFor('/bot', '', 'forhandler')).toEqual([{ label: 'Bot', href: '/bot' }]);
    expect(DEALER_PHONE_HJEM.flatMap((r) => r.keys)).not.toContain('bot');
    expect(Object.keys(PHONE_KORT_META)).not.toContain('bot');
  });

  it('siden bruker setState/playMorph uten remount og uten formvelger', () => {
    const figur = les('../app/(app)/bot/_figur.tsx');
    const side = les('../app/(app)/bot/page.tsx');
    expect(figur).toMatch(/el\.setState\(tilstand\)/);
    expect(figur).toMatch(/playMorph/);
    expect(figur).not.toMatch(/key=\{tilstand\}/);
    expect(figur).toMatch(/ENDWISE_SHAPE_ID/);
    expect(side).not.toMatch(/shape|formvelger|pebble|squircle/i);
    expect(`${figur}\n${side}`).not.toMatch(/Grok|x\.ai|中文|zh:/);
  });

  it('Avatar/blobatar er urørt', () => {
    const avatar = les('../../../packages/ui/src/components/avatar.tsx');
    expect(avatar).toMatch(/from '@blobatar\/react'/);
    expect(avatar).not.toMatch(/morph-bot|endwise-blob/);
  });

  it('Endwise-blob er original geometri med seks øye-sett', async () => {
    const { ENDWISE_BLOB, ENDWISE_SHAPE_ID } = await import(
      '../../../packages/ui/src/morph-bot/endwise-blob.js'
    );
    expect(ENDWISE_SHAPE_ID).toBe('endwise');
    expect(ENDWISE_BLOB.body96).toHaveLength(96);
    expect(ENDWISE_BLOB.eyes48.idle.L).toHaveLength(48);
    expect(Object.keys(ENDWISE_BLOB.eyes48)).toEqual([
      'idle',
      'tenker',
      'lytter',
      'laster',
      'feirer',
      'alarm',
    ]);
  });

  it('spleisen peker alle 39 tilstander på Endwise-øyne, ikke Grok-pooler', async () => {
    const { ENDWISE_OYE_FOR_TILSTAND, ENDWISE_OYE_INDEKS } = await import(
      '../../../packages/ui/src/morph-bot/endwise-splice.js'
    );
    expect(Object.keys(ENDWISE_OYE_FOR_TILSTAND)).toHaveLength(39);
    expect(ENDWISE_OYE_FOR_TILSTAND.thinking).toBe('tenker');
    expect(ENDWISE_OYE_FOR_TILSTAND.alerting).toBe('alarm');
    expect(ENDWISE_OYE_FOR_TILSTAND.sleeping).toBe('idle');
    expect(ENDWISE_OYE_INDEKS.idle).toBe(0);
    const { ENDWISE_BLOB } = await import('../../../packages/ui/src/morph-bot/endwise-blob.js');
    const { EXPRESSIONS, SHAPES, ORIGINAL_STATE_DATA } = await import(
      '../../../packages/ui/src/vendor/morph-bot/original-data.js'
    );
    const former = SHAPES as Record<string, { ring: number[][]; path: string }>;
    expect(former.endwise.ring).toHaveLength(96);
    expect(Object.values(former).every((s) => s.path === ENDWISE_BLOB.bodyPath)).toBe(true);
    expect(EXPRESSIONS[0][0][0]).toEqual(ENDWISE_BLOB_IDLE_L0);
    expect(ORIGINAL_STATE_DATA.EXPRESSION_POOLS.thinking).toEqual([ENDWISE_OYE_INDEKS.tenker]);
    expect(ORIGINAL_STATE_DATA.EXPRESSION_POOLS.idle).toEqual([ENDWISE_OYE_INDEKS.idle]);
  });
});

const ENDWISE_BLOB_IDLE_L0 = [89.837, 86.661];
