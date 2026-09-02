import { describe, expect, it } from 'vitest';
import { erTillattGaaTil } from '../src/workshop/gaa-til.ts';

describe('gåTil-hviteliste', () => {
  it('slipper inn kjente stier og avviser eksterne', () => {
    expect(erTillattGaaTil('/dashboard')).toBe(true);
    expect(erTillattGaaTil('/kunder/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(erTillattGaaTil('https://example.com')).toBe(false);
    expect(erTillattGaaTil('/settings')).toBe(false);
  });
});
