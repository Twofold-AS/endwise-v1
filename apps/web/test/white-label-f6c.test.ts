import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, merkNavOmrade } from '../app/(app)/_shell/nav.ts';

describe('F25 / white label F6c: meny områder 2', () => {
  it('uten grants er Tjenester Lager Butikk deaktivert, Hjem og Org ikke', () => {
    const merket = merkNavOmrade(FORHANDLER_NAV, {
      rolle: 'dealer_staff',
      gitt: [{ omrade: 'bookinger', niva: 'endre' }],
    });
    expect(merket.find((i) => i.key === 'home')?.disabled).toBeFalsy();
    expect(merket.find((i) => i.key === 'organisasjon')?.disabled).toBeFalsy();
    expect(merket.find((i) => i.key === 'tjenester')?.disabled).toBe(true);
    expect(merket.find((i) => i.key === 'lager')?.disabled).toBe(true);
    expect(merket.find((i) => i.key === 'butikk')?.disabled).toBe(true);
    expect(merket.find((i) => i.key === 'tjenester')?.disabledHint).toBe('Spør daglig leder');
  });
});
