import { describe, expect, it } from 'vitest';
import { threeWayMerge } from '../src/quick/merge.ts';

/**
 * Tre-veis flette-kjerne. De fire feltnivå-tilfellene + feltnivå-fletting
 * (ulike felt endret samtidig gir ingen konflikt). Rene tester, ingen DB.
 */
const F = ['name', 'email', 'phone'];

describe('threeWayMerge — de fire tilfellene', () => {
  it('1) Quick endret, vi ikke → Quick vinner', () => {
    const r = threeWayMerge(
      { name: 'A', email: 'a@x.no', phone: '1' },
      { name: 'A', email: 'a@x.no', phone: '1' },
      { name: 'A', email: 'a@x.no', phone: '2' },
      F,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.merged.phone).toBe('2');
    expect(r.newBaseline.phone).toBe('2');
  });

  it('2) Vi endret, Quick ikke → behold vår', () => {
    const r = threeWayMerge(
      { name: 'A', email: 'a@x.no', phone: '1' },
      { name: 'A', email: 'a@x.no', phone: '9' }, // vi endret phone lokalt
      { name: 'A', email: 'a@x.no', phone: '1' }, // Quick uendret
      F,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.merged.phone).toBe('9');
    // Baseline uendret (Quick sendte samme som base).
    expect(r.newBaseline.phone).toBe('1');
  });

  it('3) Begge endret til SAMME verdi → ingen konflikt', () => {
    const r = threeWayMerge(
      { name: 'A', email: null, phone: '1' },
      { name: 'A', email: null, phone: '5' },
      { name: 'A', email: null, phone: '5' },
      F,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.merged.phone).toBe('5');
    expect(r.newBaseline.phone).toBe('5');
  });

  it('4) Begge endret ULIKT → KONFLIKT, ikke overskriv', () => {
    const r = threeWayMerge(
      { name: 'A', email: 'a@x.no', phone: '1' },
      { name: 'A', email: 'a@x.no', phone: '9' }, // vi: 9
      { name: 'A', email: 'a@x.no', phone: '2' }, // Quick: 2
      F,
    );
    expect(r.conflicts).toEqual([{ field: 'phone', base: '1', ours: '9', theirs: '2' }]);
    // Ikke overskrevet (beholder vår), baseline ikke avansert (idempotent gjendetekt).
    expect(r.merged.phone).toBe('9');
    expect(r.newBaseline.phone).toBe('1');
  });
});

describe('threeWayMerge — feltnivå', () => {
  it('Quick endrer ett felt, vi et annet → begge flettes, ingen konflikt', () => {
    const r = threeWayMerge(
      { name: 'Verksted', email: 'a@x.no', phone: '1' },
      { name: 'Verksted', email: 'ny@oss.no', phone: '1' }, // vi endret e-post
      { name: 'Verksted', email: 'a@x.no', phone: '999' }, // Quick endret telefon
      F,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.merged.email).toBe('ny@oss.no'); // vår e-post beholdt
    expect(r.merged.phone).toBe('999'); // Quicks telefon tatt
  });

  it('ingen baseline → Quick vinner alt (etablerer baseline)', () => {
    const r = threeWayMerge(
      null,
      { name: 'Gammel', email: 'g@x.no', phone: '1' },
      { name: 'Ny', email: 'n@x.no', phone: '2' },
      F,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.merged).toEqual({ name: 'Ny', email: 'n@x.no', phone: '2' });
    expect(r.newBaseline).toEqual({ name: 'Ny', email: 'n@x.no', phone: '2' });
  });

  it('tomt vs null teller likt (ingen støy-konflikt)', () => {
    const r = threeWayMerge(
      { name: 'A', email: '', phone: '1' },
      { name: 'A', email: null, phone: '1' },
      { name: 'A', email: '', phone: '1' },
      F,
    );
    expect(r.conflicts).toHaveLength(0);
  });
});
