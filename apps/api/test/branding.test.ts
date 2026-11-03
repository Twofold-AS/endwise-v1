import { erForbudtCtaFarge, vurderAksent } from '@endwise/modules/branding';
import { describe, expect, it } from 'vitest';

describe('F19 / white label F3: branding-regler', () => {
  it('dårlig kontrast og forbudt blå avvises', () => {
    expect(vurderAksent('#777777').ok).toBe(false);
    expect(erForbudtCtaFarge('#0066ff')).toBe(true);
    expect(vurderAksent('#0066ff').ok).toBe(false);
  });
});
