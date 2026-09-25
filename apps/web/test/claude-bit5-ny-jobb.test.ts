import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  apningForUkedag,
  harKvalifikasjoner,
  JOB_SLOT_HVERDAG,
  JOB_SLOT_LORDAG,
  JOB_SLOT_STEG,
  jobSlots,
} from '../app/(app)/bookinger/_job-slots.ts';
import {
  KJORETOY_TYPER,
  katalogAr,
  katalogMerker,
  katalogModeller,
} from '../app/(app)/bookinger/_kjoretoy-katalog.ts';
import { TIMEPLAN_FANER } from '../app/(app)/jobber/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design BIT 5 — Ny jobb / jobSlots', () => {
  it('chrome Timeplan · Opprett jobb · Endringer er urørt', () => {
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    const ny = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(ny).toMatch(/bookings\.create/);
    expect(ny).toMatch(/extraServiceVersionIds/);
    expect(ny).toMatch(/PromptInput|Opprett jobb/);
    expect(ny).toMatch(/data-jobb-wizard/);
    expect(ny).toMatch(/get\('kunde'\)/);
    expect(ny).not.toMatch(/settleChange/);
  });

  it('jobSlots: hverdag 08–19, lør 10–15, søn stengt, 30-min, overlap + kval', () => {
    expect(JOB_SLOT_STEG).toBe(30);
    expect([...JOB_SLOT_HVERDAG]).toEqual([480, 1140]);
    expect([...JOB_SLOT_LORDAG]).toEqual([600, 900]);
    expect(apningForUkedag(6)).toBeNull();
    const mek = [{ id: 'm1', active: true, skillKeys: ['eu'] }];
    const fre = jobSlots({
      ymd: '2026-09-11',
      varighetMin: 60,
      mekanikere: mek,
      jobber: [],
      requiredSkills: ['eu'],
    });
    expect(fre[0]?.startMin).toBe(480);
    expect(fre.at(-1)?.startMin).toBe(1080);
    expect(fre.every((s) => s.startMin % 30 === 0)).toBe(true);
    const lor = jobSlots({
      ymd: '2026-09-12',
      varighetMin: 60,
      mekanikere: mek,
      jobber: [],
      requiredSkills: ['eu'],
    });
    expect(lor[0]?.startMin).toBe(600);
    expect(lor.at(-1)?.startMin).toBe(840);
    expect(
      jobSlots({
        ymd: '2026-09-13',
        varighetMin: 60,
        mekanikere: mek,
        jobber: [],
        requiredSkills: ['eu'],
      }),
    ).toEqual([]);
    const opptatt = jobSlots({
      ymd: '2026-09-11',
      varighetMin: 60,
      mekanikere: mek,
      jobber: [
        {
          mechanicId: 'm1',
          startsAt: '2026-09-11T08:00:00.000+02:00',
          endsAt: '2026-09-11T09:00:00.000+02:00',
          status: 'confirmed',
        },
      ],
      requiredSkills: ['eu'],
    });
    expect(opptatt.some((s) => s.startMin === 480)).toBe(false);
    expect(opptatt.some((s) => s.startMin === 540)).toBe(true);
    expect(harKvalifikasjoner(['eu'], ['eu'])).toBe(true);
    expect(harKvalifikasjoner(['dekk'], ['eu'])).toBe(false);
    expect(
      jobSlots({
        ymd: '2026-09-11',
        varighetMin: 60,
        mekanikere: [{ id: 'm1', active: true, skillKeys: [] }],
        jobber: [],
        requiredSkills: ['eu'],
      }),
    ).toEqual([]);
  });

  it('kjøretøy-kaskade leser eksisterende katalog, ikke oppdiktet merke-liste', () => {
    expect(KJORETOY_TYPER.map((t) => t.label)).toEqual(['MC', 'Båt', 'ATV']);
    const rader = [
      { type: 'mc', make: 'Yamaha', model: 'MT-07', modelYear: '2022' },
      { type: 'mc', make: 'Honda', model: 'CB500', modelYear: '2021' },
    ];
    expect(katalogMerker(rader, 'mc')).toEqual(['Honda', 'Yamaha']);
    expect(katalogModeller(rader, 'mc', 'Yamaha')).toEqual(['MT-07']);
    expect(katalogAr(rader, 'mc', 'Yamaha', 'MT-07')).toEqual(['2022']);
    expect(katalogMerker(rader, 'boat')).toEqual([]);
    const kaskade = utenKommentarer(les('../app/(app)/bookinger/_kjoretoy-kaskade.tsx'));
    expect(kaskade).toMatch(/data-kjoretoy-kaskade/);
    expect(kaskade).toMatch(/ingen katalog/);
    const ny = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(ny).toMatch(/KjoretoyKaskade/);
    expect(ny).toMatch(/data-jobb-park/);
    const kunde = utenKommentarer(les('../app/(app)/kunder/_ny-kunde.tsx'));
    expect(kunde).toMatch(/Legg til kjøretøy/);
    expect(kunde).toMatch(/data-parent-park/);
    const kort = utenKommentarer(les('../app/(app)/kunder/[id]/page.tsx'));
    expect(kort).toMatch(/\/bookinger\/ny\?kunde=/);
  });
});
