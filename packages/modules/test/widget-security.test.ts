import { describe, expect, it } from 'vitest';
import {
  computeFreeSlots,
  isOfferedSlot,
  pickMechanicWithRoom,
  widgetDayKey,
  widgetWallTime,
  widgetWorkingDay,
} from '../src/widget/availability.ts';
import { normalizeOrigin, originAllowed } from '../src/widget/origin.ts';
import { createRateLimiter } from '../src/widget/rate-limit.ts';
import { signWidgetToken, verifyWidgetToken, WidgetTokenError } from '../src/widget/token.ts';

/**
 * F4-02 — Sikkerhetskjernen for den OFFENTLIGE widgeten. Rene tester (ingen DB).
 */

describe('widget-token (HS256)', () => {
  const secret = 'topphemmelig-widget-secret';

  it('rundtur: verifisert payload = utstedt', () => {
    const t = signWidgetToken({ tid: 'tenant-a', cid: 'customer:1' }, secret, 60);
    const p = verifyWidgetToken(t, secret);
    expect(p.tid).toBe('tenant-a');
    expect(p.cid).toBe('customer:1');
  });

  it('feil hemmelighet avvises', () => {
    const t = signWidgetToken({ tid: 'a', cid: 'c' }, secret);
    expect(() => verifyWidgetToken(t, 'annen-secret')).toThrow(WidgetTokenError);
  });

  it('tuklet payload avvises (signatur)', () => {
    const t = signWidgetToken({ tid: 'a', cid: 'c' }, secret);
    const [h, , s] = t.split('.');
    const forged = `${h}.${Buffer.from(JSON.stringify({ tid: 'b', cid: 'c', exp: 9e9 })).toString('base64url')}.${s}`;
    expect(() => verifyWidgetToken(forged, secret)).toThrow(WidgetTokenError);
  });

  it('utløpt token avvises', () => {
    const t = signWidgetToken({ tid: 'a', cid: 'c' }, secret, -1);
    expect(() => verifyWidgetToken(t, secret)).toThrow(/utløpt/i);
  });

  it('alg=none-forsøk avvises', () => {
    const head = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ tid: 'a', cid: 'c', exp: 9e9 })).toString(
      'base64url',
    );
    expect(() => verifyWidgetToken(`${head}.${body}.`, secret)).toThrow(WidgetTokenError);
  });
});

describe('origin-validering', () => {
  const allowed = ['https://verksted.no', 'https://www.verksted.no'];
  it('godtar registrert origin', () => {
    expect(originAllowed('https://verksted.no', allowed)).toBe(true);
  });
  it('avviser ukjent origin', () => {
    expect(originAllowed('https://evil.com', allowed)).toBe(false);
  });
  it('avviser suffiks-spoof', () => {
    expect(originAllowed('https://verksted.no.evil.com', allowed)).toBe(false);
  });
  it('avviser manglende/ugyldig origin (feiler lukket)', () => {
    expect(originAllowed(null, allowed)).toBe(false);
    expect(originAllowed('søppel', allowed)).toBe(false);
  });
  it('normaliserer bort sti/case', () => {
    expect(normalizeOrigin('https://Verksted.NO/booking')).toBe('https://verksted.no');
  });
});

describe('rate-limiter', () => {
  it('slipper opptil max, blokkerer så', () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3 });
    expect(rl.check('k').allowed).toBe(true);
    expect(rl.check('k').allowed).toBe(true);
    expect(rl.check('k').allowed).toBe(true);
    expect(rl.check('k').allowed).toBe(false); // 4. blokkeres
  });
  it('separate nøkler teller separat', () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('b').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
  });
});

describe('computeFreeSlots', () => {
  const day = (h: number, m = 0) => new Date(Date.UTC(2026, 6, 20, h, m));

  it('deler dagen i slots, hopper over opptatt', () => {
    const slots = computeFreeSlots({
      dayStart: day(8),
      dayEnd: day(10),
      durationMinutes: 60,
      stepMinutes: 60,
      capacity: 1,
      busy: [{ start: day(8), end: day(9) }], // 08–09 opptatt
    });
    // Ledig: 09:00 (08:00 er opptatt, 10:00 passer ikke 60 min innen 10:00).
    expect(slots.map((s) => s.getUTCHours())).toEqual([9]);
  });

  it('kapasitet 2: slot ledig til begge er opptatt', () => {
    const slots = computeFreeSlots({
      dayStart: day(8),
      dayEnd: day(9),
      durationMinutes: 60,
      stepMinutes: 60,
      capacity: 2,
      busy: [{ start: day(8), end: day(9) }], // kun én av to opptatt
    });
    expect(slots).toHaveLength(1); // fortsatt ledig kapasitet
  });

  it('notBefore filtrerer bort fortid', () => {
    const slots = computeFreeSlots({
      dayStart: day(8),
      dayEnd: day(12),
      durationMinutes: 60,
      stepMinutes: 60,
      capacity: 1,
      busy: [],
      notBefore: day(10),
    });
    expect(Math.min(...slots.map((s) => s.getUTCHours()))).toBe(10);
  });

  it('F4-20: start som passer 30 min passer ikke 180 min samme dag (Oslo)', () => {
    const { dayStart, dayEnd } = widgetWorkingDay('2026-09-15');
    const late = widgetWallTime('2026-09-15', 15, 30);
    const short = computeFreeSlots({
      dayStart,
      dayEnd,
      durationMinutes: 30,
      stepMinutes: 30,
      busy: [],
    });
    const long = computeFreeSlots({
      dayStart,
      dayEnd,
      durationMinutes: 180,
      stepMinutes: 30,
      busy: [],
    });
    expect(isOfferedSlot(late, short)).toBe(true);
    expect(isOfferedSlot(late, long)).toBe(false);
  });

  it('isOfferedSlot krever samme millisekund', () => {
    const slot = widgetWallTime('2026-09-15', 9, 0);
    expect(isOfferedSlot(slot, [slot])).toBe(true);
    expect(isOfferedSlot(new Date(slot.getTime() + 1000), [slot])).toBe(false);
  });

  it('avviser når shop-kapasiteten er full', () => {
    const dayStart = new Date(Date.UTC(2026, 8, 15, 6, 0));
    const dayEnd = new Date(Date.UTC(2026, 8, 15, 14, 0));
    const slot = new Date(Date.UTC(2026, 8, 15, 7, 0));
    const full = computeFreeSlots({
      dayStart,
      dayEnd,
      durationMinutes: 60,
      stepMinutes: 60,
      capacity: 2,
      busy: [
        { start: slot, end: new Date(slot.getTime() + 60_000 * 60) },
        { start: slot, end: new Date(slot.getTime() + 60_000 * 60) },
      ],
    });
    expect(isOfferedSlot(slot, full)).toBe(false);
  });

  it('kapasitet 0 (ingen mekanikere) gir ingen slots', () => {
    expect(
      computeFreeSlots({
        dayStart: new Date(Date.UTC(2026, 8, 15, 6)),
        dayEnd: new Date(Date.UTC(2026, 8, 15, 14)),
        durationMinutes: 60,
        stepMinutes: 60,
        capacity: 0,
        busy: [],
      }),
    ).toEqual([]);
  });
});

describe('widgetWorkingDay (Europe/Oslo)', () => {
  it('sommer: 08–16 Oslo er 06:00–14:00 UTC', () => {
    const { dayStart, dayEnd } = widgetWorkingDay('2026-09-15');
    expect(dayStart.toISOString()).toBe('2026-09-15T06:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-09-15T14:00:00.000Z');
  });

  it('vinter: 08–16 Oslo er 07:00–15:00 UTC', () => {
    const { dayStart, dayEnd } = widgetWorkingDay('2026-01-15');
    expect(dayStart.toISOString()).toBe('2026-01-15T07:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-01-15T15:00:00.000Z');
  });

  it('15:30 UTC i september er 17:30 Oslo — ikke et tilbudt slot', () => {
    const utc = new Date('2026-09-15T15:30:00.000Z');
    expect(widgetDayKey(utc)).toBe('2026-09-15');
    const { dayStart, dayEnd } = widgetWorkingDay(utc);
    const slots = computeFreeSlots({
      dayStart,
      dayEnd,
      durationMinutes: 30,
      stepMinutes: 30,
      busy: [],
    });
    expect(isOfferedSlot(utc, slots)).toBe(false);
    expect(isOfferedSlot(widgetWallTime('2026-09-15', 15, 30), slots)).toBe(true);
  });
});

describe('pickMechanicWithRoom (CWE-841)', () => {
  const start = new Date('2026-09-15T07:00:00.000Z');
  const end = new Date('2026-09-15T08:00:00.000Z');

  it('hopper over mekanikeren som er full, tar den med rom', () => {
    const id = pickMechanicWithRoom(
      [
        { id: 'aaaa', capacity: 1 },
        { id: 'bbbb', capacity: 1 },
      ],
      [{ mechanicId: 'aaaa', start, end }],
      start,
      end,
    );
    expect(id).toBe('bbbb');
  });

  it('returnerer null når hele shopen er full', () => {
    expect(
      pickMechanicWithRoom(
        [
          { id: 'aaaa', capacity: 1 },
          { id: 'bbbb', capacity: 1 },
        ],
        [
          { mechanicId: 'aaaa', start, end },
          { mechanicId: 'bbbb', start, end },
        ],
        start,
        end,
      ),
    ).toBeNull();
  });
});
