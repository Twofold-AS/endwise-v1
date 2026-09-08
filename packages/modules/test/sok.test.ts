import { describe, expect, it } from 'vitest';
import {
  filtrerTommeGrupper,
  grupperSider,
  normaliserSok,
  SOK_MIN,
  treffInneholder,
} from '../src/sok/index.ts';

describe('globalt søk — nøkler', () => {
  it('krever minst SOK_MIN tegn etter trim', () => {
    expect(SOK_MIN).toBe(2);
    expect(normaliserSok('')).toBeNull();
    expect(normaliserSok(' K ')).toBeNull();
    expect(normaliserSok('  Kari  ')).toBe('Kari');
  });

  it('treff er case-insensitive på norsk', () => {
    expect(treffInneholder('Kari Nordmann', 'kari')).toBe(true);
    expect(treffInneholder('Kari Nordmann', 'NORDMANN')).toBe(true);
    expect(treffInneholder(null, 'kari')).toBe(false);
  });

  it('skjuler tomme grupper og slår sider inn som Sider', () => {
    expect(filtrerTommeGrupper([{ kategori: 'Kunde', treff: [] }])).toEqual([]);
    const sider = grupperSider(
      [
        { key: 'kunder', label: 'Kunder', href: '/kunder' },
        { key: 'innboks', label: 'Innboks', href: '/innboks' },
      ],
      'kun',
    );
    expect(sider?.kategori).toBe('Sider');
    expect(sider?.treff.map((t) => t.tittel)).toEqual(['Kunder']);
  });
});
