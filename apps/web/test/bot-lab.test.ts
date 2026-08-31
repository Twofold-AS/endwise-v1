import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PHONE_HJEM, PHONE_KORT_META } from '../app/(app)/_shell/phone-home.ts';
import { BOT_HOVED, BOT_TILSTANDER, BOT_UTTRYKK } from '../app/(app)/bot/_katalog.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Bot-lab — bloub', () => {
  it('har 14 SEQUENCE-tilstander, 16 uttrykk og primærchips mot bloub', () => {
    expect(BOT_TILSTANDER).toHaveLength(14);
    expect(BOT_TILSTANDER).not.toContain('swirl');
    expect(BOT_UTTRYKK).toEqual([
      'neutre',
      'attentif',
      'surpris',
      'excite',
      'heureux',
      'hilare',
      'colere',
      'triste',
      'effraye',
      'mefiant',
      'confus',
      'curieux',
      'fier',
      'timide',
      'blase',
      'somnolent',
    ]);
    expect(BOT_HOVED.map((h) => h.label)).toEqual([
      'idle',
      'tenker',
      'lytter',
      'laster',
      'feirer',
      'alarm',
      'orbit',
    ]);
    expect(BOT_HOVED.map((h) => h.tilstand)).toEqual([
      'idle',
      'thinking',
      'idle',
      'thinking',
      'burst',
      'alert',
      'orbit',
    ]);
    expect(BOT_HOVED.find((h) => h.oye === 'lytter')?.uttrykk).toBe('attentif');
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

  it('siden kjører BloubBot uten remount, uten Morph og uten formvelger', () => {
    const figur = les('../app/(app)/bot/_figur.tsx');
    const side = les('../app/(app)/bot/page.tsx');
    const wrapper = les('../../../packages/ui/src/bloub/BloubBot.tsx');
    expect(figur).toMatch(/BloubBot/);
    expect(figur).toMatch(/shape="cercle"/);
    expect(figur).not.toMatch(/key=\{tilstand\}/);
    expect(wrapper).toMatch(/engine\.setState/);
    expect(wrapper).toMatch(/engine\.sample\(clock\)/);
    expect(wrapper).toMatch(/0\.064/);
    expect(wrapper).toMatch(/maskUnits/);
    expect(wrapper).toMatch(/fill="#000"/);
    expect(wrapper).not.toMatch(/from ['"]vue['"]/);
    expect(`${figur}\n${side}`).not.toMatch(
      /morph-bot|playMorph|ENDWISE_SHAPE_ID|pebble|squircle/i,
    );
    expect(`${figur}\n${side}`).not.toMatch(/Grok|x\.ai|中文|zh:/);
  });

  it('Avatar/blobatar er urørt', () => {
    const avatar = les('../../../packages/ui/src/components/avatar.tsx');
    expect(avatar).toMatch(/from '@blobatar\/react'/);
    expect(avatar).not.toMatch(/morph-bot|endwise-blob|bloub|BloubBot/);
  });

  it('ingen Morph-tre er igjen, og motoren sample-er tilstandene', async () => {
    const { existsSync } = await import('node:fs');
    expect(existsSync(resolve(her, '../../../packages/ui/src/vendor/morph-bot'))).toBe(false);
    expect(existsSync(resolve(her, '../../../packages/ui/src/morph-bot'))).toBe(false);

    const { BotEngine } = await import('../../../packages/ui/src/vendor/bloub/engine.ts');
    const { SEQUENCE } = await import('../../../packages/ui/src/vendor/bloub/states.ts');
    const { SHAPE_BY_ID } = await import('../../../packages/ui/src/vendor/bloub/skins.ts');
    const { EXPRESSION_BY_ID } = await import(
      '../../../packages/ui/src/vendor/bloub/expressions.ts'
    );

    expect(SEQUENCE).toHaveLength(14);
    const cercle = SHAPE_BY_ID.get('cercle');
    expect(cercle?.radii.every((r) => r === 1)).toBe(true);

    const engine = new BotEngine(
      100,
      'idle',
      cercle?.radii ?? null,
      EXPRESSION_BY_ID.get('neutre'),
    );
    const idle = engine.sample(1.2);
    expect(idle.bodyPath.startsWith('M')).toBe(true);
    expect(idle.eyes).toHaveLength(2);
    expect(idle.dots).toHaveLength(0);

    engine.setState('thinking', 2);
    const tenker = engine.sample(3.2);
    // midtre prikk ER kroppen; to prikker ligger i decor
    expect(tenker.dots).toHaveLength(2);
    expect(tenker.eyes).toHaveLength(0);

    engine.setState('alert', 4);
    const alarm = engine.sample(4.75);
    expect(alarm.dots.length).toBeGreaterThan(0);

    engine.setState('burst', 6);
    const feirer = engine.sample(6.45);
    expect(feirer.dots.length).toBeGreaterThan(0);
    expect(feirer.dotsBehind).toBe(true);

    engine.setState('orbit', 8);
    const orbit = engine.sample(9.2);
    expect(orbit.arcs.length).toBeGreaterThan(0);
  });
});
