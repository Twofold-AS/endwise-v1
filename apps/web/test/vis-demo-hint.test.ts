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

  it('kan være på i Vercel-preview', () => {
    expect(visDemoHint({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(true);
  });

  it('er på i lokal dev', () => {
    expect(visDemoHint({ NODE_ENV: 'development' })).toBe(true);
  });
});

describe('F1-26: /signin lekker ikke seed-hint i prod-kilden uten env-sjekk', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const kilde = readFileSync(resolve(her, '../app/signin/page.tsx'), 'utf8');
  const utenKommentarer = kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('viser seed-hintet bare via visDemoHint — ikke som hardkodet footer', () => {
    expect(utenKommentarer).toMatch(/visDemoHint\s*\(/);
    expect(utenKommentarer).toMatch(/pnpm db:seed/);
    // Hintet skal ikke stå utenfor env-sjekken.
    const hintIdx = utenKommentarer.indexOf('pnpm db:seed');
    const sjekkIdx = utenKommentarer.indexOf('visDemoHint');
    expect(sjekkIdx).toBeGreaterThanOrEqual(0);
    expect(hintIdx).toBeGreaterThan(sjekkIdx);
  });

  it('nevner ikke konkrete demo-passord', () => {
    expect(utenKommentarer).not.toMatch(/endwise-demo-1/);
  });
});
