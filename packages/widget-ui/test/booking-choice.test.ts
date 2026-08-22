import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resetBookingChoice } from '../src/booking-choice.ts';
import { WIDGET_FALLBACK } from '../src/widget-fallbacks.ts';

const root = dirname(fileURLToPath(import.meta.url));

describe('resetBookingChoice (F4-20)', () => {
  it('tømmer både slots og chosen', () => {
    expect(resetBookingChoice()).toEqual({ slots: [], chosen: '' });
  });

  it('kalles i onChange på både select og datofelt — ikke bare i loadSlots', () => {
    const src = readFileSync(join(root, '../src/EndwiseWidget.tsx'), 'utf8');
    const resetCalls = src.match(/resetBookingChoice\(\)/g) ?? [];
    expect(resetCalls.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/onChange=\{[\s\S]*?resetBookingChoice/);
    // Hypotesen som ble verifisert: loadSlots tømmer også, men det er for sent alene.
    expect(src).toMatch(/async function loadSlots\(\) \{[\s\S]*?setChosen\(''\)/);
  });
});

describe('widget-fallbacks', () => {
  it('er lyst tema med svart aksent, ikke mørk/grønn/rød', () => {
    expect(WIDGET_FALLBACK.bg).toBe('#ffffff');
    expect(WIDGET_FALLBACK.accent).toBe('#111111');
    expect(WIDGET_FALLBACK.accentFg).toBe('#ffffff');
    const src = readFileSync(join(root, '../src/EndwiseWidget.tsx'), 'utf8');
    expect(src).not.toMatch(/#151515|#1[Ee][Dd]27[Dd]|#EE2924|#04140b/i);
  });
});
