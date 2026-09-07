import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');

describe('Synara dual-theme tokens', () => {
  it('lyst: warm stone, ink-CTA, terracotta-lenke — ikke Action Blue / lime', () => {
    const light = css.slice(0, css.search(/\.dark,\s*\[data-theme="dark"\]/));
    expect(light).toMatch(/--ew-bg:\s*#f5f4f2/);
    expect(light).toMatch(/--ew-sidebar:\s*#fbfaf8/);
    expect(light).toMatch(/--ew-sidebar-active:\s*#e8e6e2/);
    expect(light).toMatch(/--ew-surface:\s*#fbfaf8/);
    expect(light).toMatch(/--ew-fg:\s*#141413/);
    expect(light).toMatch(/--ew-fg-muted:\s*#5b5955/);
    expect(light).toMatch(/--ew-fg-faint:\s*#66635e/);
    expect(light).toMatch(/--ew-ink-utility:\s*#1c1917/);
    expect(light).toMatch(/--ew-accent:\s*#a43a0a/);
    expect(light).toMatch(/--ew-accent-pip:\s*#c45a1a/);
    expect(light).toMatch(/--ew-sidebar-section:\s*#66635e/);
    expect(light).not.toMatch(/--ew-accent:\s*#407ff2/);
    expect(light).not.toMatch(/--ew-[a-z0-9-]+:\s*#1ED27D/i);
    expect(light).not.toMatch(/#e4f222/);
    expect(light).toMatch(/--ew-bevel-shadow:\s*none/);
    expect(css).toMatch(/--ew-radius-xl:\s*0\.625rem/);
    expect(css).toMatch(/--ew-radius-pill:\s*9999px/);
    expect(css).toMatch(/--ew-radius-control:\s*0\.625rem/);
    expect(css).toMatch(/Geist/);
  });

  it('mørkt: #121110 / #1a1918 / invertert CTA / #ffb27f — ikke bek #000 / lime', () => {
    const dark = css.slice(css.search(/\.dark,\s*\[data-theme="dark"\]/));
    expect(dark).toMatch(/--ew-bg:\s*#121110/);
    expect(dark).toMatch(/--ew-sidebar:\s*#1a1918/);
    expect(dark).toMatch(/--ew-surface:\s*#1a1918/);
    expect(dark).toMatch(/--ew-fg:\s*#f5f4f2/);
    expect(dark).toMatch(/--ew-fg-muted:\s*#aaa8a3/);
    expect(dark).toMatch(/--ew-ink-utility:\s*#fafaf9/);
    expect(dark).toMatch(/--ew-accent:\s*#ffb27f/);
    expect(dark).toMatch(/--ew-accent-pip:\s*#ffb27f/);
    expect(dark).not.toMatch(/--ew-bg:\s*#000000/);
    expect(dark).not.toMatch(/#e4f222/);
    expect(css).toMatch(/\.dark,/);
    expect(css).toMatch(/\[data-theme="dark"\]/);
  });
});
