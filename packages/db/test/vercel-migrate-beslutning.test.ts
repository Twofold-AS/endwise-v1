import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { vercelMigrateBeslutning } from '../scripts/vercel-migrate-beslutning.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('vercelMigrateBeslutning', () => {
  it('kjører på Vercel production når DATABASE_URL er satt', () => {
    expect(
      vercelMigrateBeslutning({
        VERCEL: '1',
        VERCEL_ENV: 'production',
        DATABASE_URL: 'postgres://eier@db/endwise',
      }),
    ).toEqual({ handling: 'kjør' });
  });

  it('stopper Vercel production uten DATABASE_URL (ikke stille hopp)', () => {
    const ut = vercelMigrateBeslutning({
      VERCEL: '1',
      VERCEL_ENV: 'production',
    });
    expect(ut.handling).toBe('stopp');
    if (ut.handling === 'stopp') {
      expect(ut.grunn).toMatch(/DATABASE_URL mangler/);
      expect(ut.grunn).toMatch(/passThroughEnv/);
    }
  });

  it('kjører uten VERCEL-flagg når VERCEL_ENV=production og URL er satt', () => {
    expect(
      vercelMigrateBeslutning({
        VERCEL_ENV: 'production',
        DATABASE_URL: 'postgres://eier@db/endwise',
      }),
    ).toEqual({ handling: 'kjør' });
  });

  it('hopper over preview selv med DATABASE_URL', () => {
    expect(
      vercelMigrateBeslutning({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        DATABASE_URL: 'postgres://eier@db/endwise',
      }),
    ).toEqual({ handling: 'hopp', grunn: 'VERCEL_ENV=preview' });
  });

  it('hopper over lokal next build', () => {
    expect(vercelMigrateBeslutning({})).toEqual({
      handling: 'hopp',
      grunn: 'ikke Vercel production / ENDWISE_GA_LIVE',
    });
  });

  it('kjører lokalt/CI når ENDWISE_GA_LIVE=1 og URL er satt', () => {
    expect(
      vercelMigrateBeslutning({
        ENDWISE_GA_LIVE: '1',
        DATABASE_URL: 'postgres://eier@db/endwise',
      }),
    ).toEqual({ handling: 'kjør' });
  });

  it('hopper over ENDWISE_GA_LIVE=1 uten URL (GitHub secret mangler)', () => {
    expect(vercelMigrateBeslutning({ ENDWISE_GA_LIVE: '1' })).toEqual({
      handling: 'hopp',
      grunn: 'DATABASE_URL mangler',
    });
  });
});

describe('turbo slipper DATABASE_URL gjennom uten å hashe den', () => {
  it('build.passThroughEnv inneholder DATABASE_URL, ikke globalEnv', () => {
    const turbo = readFileSync(resolve(her, '../../../turbo.json'), 'utf8');
    expect(turbo).toMatch(/"passThroughEnv"/);
    expect(turbo).toMatch(/"DATABASE_URL"/);
    expect(turbo).not.toMatch(/"globalPassThroughEnv"/);
    const parsed = JSON.parse(turbo) as {
      globalEnv?: string[];
      tasks?: { build?: { passThroughEnv?: string[] } };
    };
    expect(parsed.tasks?.build?.passThroughEnv).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'VERCEL', 'ENDWISE_GA_LIVE']),
    );
    expect(parsed.globalEnv ?? []).not.toContain('DATABASE_URL');
  });

  it('web-build hasher migrate-script og drizzle så cache ikke hopper over migrate', () => {
    const webTurbo = readFileSync(resolve(her, '../../../apps/web/turbo.json'), 'utf8');
    expect(webTurbo).toMatch(/vercel-migrate\.ts/);
    expect(webTurbo).toMatch(/packages\/db\/drizzle/);
  });
});
