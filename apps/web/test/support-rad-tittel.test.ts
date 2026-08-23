import { describe, expect, it } from 'vitest';
import { supportRadTittel } from '../app/(app)/innboks/_lib.ts';

describe('supportRadTittel', () => {
  it('viser person og forhandler, aldri tom avsender', () => {
    expect(supportRadTittel('Kari', 'Yamaha Bergen')).toBe('Kari · Yamaha Bergen');
    expect(supportRadTittel('Skiftenøkkelen', 'Yamaha Bergen')).toBe(
      'Skiftenøkkelen · Yamaha Bergen',
    );
    expect(supportRadTittel(null, 'Yamaha Bergen')).toBe('Yamaha Bergen');
    expect(supportRadTittel('Kari', null)).toBe('Kari');
    expect(supportRadTittel('  ', '')).toBe('Endwise-samtale');
    expect(supportRadTittel(undefined, undefined)).toBe('Endwise-samtale');
  });
});
