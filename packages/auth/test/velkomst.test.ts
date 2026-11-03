import { describe, expect, it } from 'vitest';
import { byggVelkomstEpost, skalSendeVelkomst } from '../src/senders/velkomst.ts';

describe('F35 / white label F12: velkomst', () => {
  it('sender ikke ved Quick-import', () => {
    expect(skalSendeVelkomst('quick')).toBe(false);
    expect(skalSendeVelkomst('endwise')).toBe(true);
    expect(skalSendeVelkomst(null)).toBe(true);
  });

  it('teksten har ingen personopplysninger', () => {
    const epost = byggVelkomstEpost({
      merke: { navn: 'Nordvik', levertAv: true },
      personvernUrl: 'https://nordvik.endwise.no/personvern',
      avmeldUrl: 'https://nordvik.endwise.no/personvern',
    });
    expect(epost.subject).toBe('Velkommen');
    expect(epost.text).toMatch(/Personvernerklæring/);
    expect(epost.text).not.toMatch(/@/);
    expect(epost.html).not.toMatch(/#0066ff/);
    expect(epost.html).toMatch(/personvern/);
  });
});
