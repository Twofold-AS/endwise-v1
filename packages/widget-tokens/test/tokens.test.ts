import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');

describe('mørk sidebakgrunn er bek', () => {
  it('[data-theme="dark"] --ew-bg er #000000', () => {
    const dark = css.slice(css.indexOf('[data-theme="dark"]'));
    expect(dark).toMatch(/--ew-bg:\s*#000000/);
    expect(dark).not.toMatch(/--ew-bg:\s*#171717/);
  });

  it('lyst Frost-side, Apple Blue valgt og Link Blue-lenke', () => {
    const light = css.slice(0, css.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ew-bg:\s*#f5f5f7/);
    expect(light).toMatch(/--ew-sidebar:\s*#f5f5f7/);
    expect(light).toMatch(/--ew-sidebar-active:\s*#0071e3/);
    expect(light).toMatch(/--ew-surface:\s*#ffffff/);
    expect(light).toMatch(/--ew-inset:\s*#f4f8fb/);
    expect(light).toMatch(/--ew-disabled:\s*#e2e2e5/);
    expect(light).toMatch(/--ew-fg:\s*#1d1d1f/);
    expect(light).toMatch(/--ew-accent:\s*#0066cc/);
    expect(light).toMatch(/--ew-accent-strong:\s*#0071e3/);
    expect(light).toMatch(/--ew-accent-on-dark:\s*#2997ff/);
    expect(light).toMatch(/--ew-border:\s*#d2d2d7/);
    expect(light).toMatch(/--ew-bevel-shadow:\s*none/);
    expect(css).toMatch(/--ew-radius-xl:\s*8px/);
    expect(css).toMatch(/--ew-radius-sheet:\s*16px/);
    expect(css).toMatch(/--ew-radius-pill:\s*980px/);
    expect(css).toMatch(/--ew-radius-control:\s*8px/);
  });

  it('sidebar og kortflater er fortsatt løftet i mørkt', () => {
    const dark = css.slice(css.indexOf('[data-theme="dark"]'));
    expect(dark).toMatch(/--ew-sidebar:\s*#1a1a1a/);
    expect(dark).toMatch(/--ew-surface:\s*#1f1f1f/);
  });
});
