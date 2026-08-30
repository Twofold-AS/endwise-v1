import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

describe('mørk sidebakgrunn er bek', () => {
  it('[data-theme="dark"] --ew-bg er #000000', () => {
    const dark = css.slice(css.indexOf('[data-theme="dark"]'));
    expect(dark).toMatch(/--ew-bg:\s*#000000/);
    expect(dark).not.toMatch(/--ew-bg:\s*#171717/);
  });

  it('lyst --ew-bg er uendret #ffffff', () => {
    const light = css.slice(0, css.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ew-bg:\s*#ffffff/);
  });

  it('sidebar og kortflater er fortsatt løftet i mørkt', () => {
    const dark = css.slice(css.indexOf('[data-theme="dark"]'));
    expect(dark).toMatch(/--ew-sidebar:\s*#1a1a1a/);
    expect(dark).toMatch(/--ew-surface:\s*#1f1f1f/);
  });
});
