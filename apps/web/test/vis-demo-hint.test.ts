import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { visDemoHint } from '../lib/vis-demo-hint.ts';

/**
 * F1-26 / CWE-215 — seed-/demo-hint på /signin skal aldri følge med i
 * produksjonsbygget. Preview/dev kan vise den, men bare bak env-sjekk.
 */
describe('visDemoHint', () => {
  it('er av i Vercel-produksjon', () => {
    expect(visDemoHint({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('er av for `next start` / produksjonslik NODE_ENV uten preview', () => {
    expect(visDemoHint({ NODE_ENV: 'production' })).toBe(false);
  });

  it('er av i Vercel-preview — Mikael skal ikke se seed/demo', () => {
    expect(visDemoHint({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(false);
  });

  it('er av i lokal dev', () => {
    expect(visDemoHint({ NODE_ENV: 'development' })).toBe(false);
  });
});

describe('F1-26: /signin viser aldri seed-/demo-hint', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const kilde = readFileSync(resolve(her, '../app/signin/page.tsx'), 'utf8');
  const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('har ingen pnpm db:seed, demo-konto eller demo-passord', () => {
    expect(utenKommentarer).not.toMatch(/pnpm db:seed/);
    expect(utenKommentarer).not.toMatch(/[Dd]emo-konto|[Dd]emo-passord/);
  });

  it('nevner ikke konkrete demo-passord', () => {
    expect(utenKommentarer).not.toMatch(/endwise-demo-1/);
  });
});
