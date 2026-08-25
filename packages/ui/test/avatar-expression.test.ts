import * as expressions from 'blobatar/expression';
import { describe, expect, it } from 'vitest';

/**
 * F6-19 — Vokabularet vårt er bibliotekets ekte `expression`-eksporter.
 * Vi gjetter ikke enum. De ti vi persisterer er et kuratert utvalg av de
 * fjorten blobatar eksporterer.
 */
const KURATERT = [
  'idle',
  'happy',
  'wink',
  'smug',
  'sleepy',
  'thinking',
  'surprised',
  'unsure',
  'love',
  'shy',
] as const;

describe('blobatar/expression — bibliotekets ekte uttrykk', () => {
  it('eksporterer de ti vi tilbyr i velgeren', () => {
    for (const navn of KURATERT) {
      expect(expressions).toHaveProperty(navn);
    }
  });

  it('eksporterer også sad/mad/sick/scared — vi persisterer dem ikke', () => {
    expect(expressions).toHaveProperty('sad');
    expect(expressions).toHaveProperty('mad');
    expect(expressions).toHaveProperty('sick');
    expect(expressions).toHaveProperty('scared');
  });
});
