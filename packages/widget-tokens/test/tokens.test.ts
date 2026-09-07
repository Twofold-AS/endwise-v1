import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');

describe('Mobbin dual-theme tokens', () => {
  it('lyst: gallery-white, ink-CTA, #0066ff kun som aksent — ikke Synara/Attio/lime', () => {
    const light = css.slice(0, css.search(/\.dark,\s*\[data-theme="dark"\]/));
    expect(light).toMatch(/--ew-bg:\s*#ffffff/);
    expect(light).toMatch(/--ew-sidebar:\s*#ffffff/);
    expect(light).toMatch(/--ew-sidebar-active:\s*#f3f3f3/);
    expect(light).toMatch(/--ew-surface:\s*#ffffff/);
    expect(light).toMatch(/--ew-surface-2:\s*#f3f3f3/);
    expect(light).toMatch(/--ew-inset:\s*#f0f0f0/);
    expect(light).toMatch(/--ew-fg:\s*#141414/);
    expect(light).toMatch(/--ew-fg-muted:\s*#707070/);
    expect(light).toMatch(/--ew-fg-faint:\s*#adadad/);
    expect(light).toMatch(/--ew-ink-utility:\s*#141414/);
    expect(light).toMatch(/--ew-accent:\s*#0066ff/);
    expect(light).toMatch(/--ew-focus:\s*#141414/);
    expect(light).toMatch(/--ew-border:\s*#e0e0e0/);
    expect(light).not.toMatch(/--ew-accent:\s*#407ff2/);
    expect(light).not.toMatch(/--ew-accent:\s*#a43a0a/);
    expect(light).not.toMatch(/--ew-[a-z0-9-]+:\s*#1ED27D/i);
    expect(light).not.toMatch(/#e4f222/);
    expect(light).not.toMatch(/#f5f4f2|#121110|#ffb27f|#1c1917|#c45a1a/);
    expect(light).toMatch(/--ew-bevel-shadow:\s*none/);
    expect(css).toMatch(/--ew-radius-xl:\s*24px/);
    expect(css).toMatch(/--ew-radius-sm:\s*16px/);
    expect(css).toMatch(/--ew-radius-pill:\s*9999px/);
    expect(css).toMatch(/--ew-radius-control:\s*9999px/);
    expect(css).toMatch(/Inter/);
    expect(css).not.toMatch(/Geist/);
    expect(css).not.toMatch(/--ew-accent-pip/);
  });

  it('mørkt: ink↔canvas-inversjon, samme aksent, ikke Synara-stein / bek #000 / lime', () => {
    const dark = css.slice(css.search(/\.dark,\s*\[data-theme="dark"\]/));
    expect(dark).toMatch(/--ew-bg:\s*#141414/);
    expect(dark).toMatch(/--ew-sidebar:\s*#141414/);
    expect(dark).toMatch(/--ew-sidebar-active:\s*#262626/);
    expect(dark).toMatch(/--ew-surface:\s*#262626/);
    expect(dark).toMatch(/--ew-fg:\s*#ffffff/);
    expect(dark).toMatch(/--ew-fg-muted:\s*#adadad/);
    expect(dark).toMatch(/--ew-ink-utility:\s*#ffffff/);
    expect(dark).toMatch(/--ew-accent:\s*#0066ff/);
    expect(dark).toMatch(/--ew-focus:\s*#ffffff/);
    expect(dark).not.toMatch(/--ew-bg:\s*#000000/);
    expect(dark).not.toMatch(/#e4f222/);
    expect(dark).not.toMatch(/#f5f4f2|#121110|#ffb27f|#1a1918|#fafaf9/);
    expect(css).toMatch(/\.dark,/);
    expect(css).toMatch(/\[data-theme="dark"\]/);
    expect(css).toMatch(/--ew-switch-track-on:\s*var\(--ew-ink-utility\)/);
  });
});
